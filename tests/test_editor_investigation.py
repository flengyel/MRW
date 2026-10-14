"""Bounded editor investigation lifecycle and publication failures; no network."""
from copy import deepcopy
from hashlib import sha256
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from theorem_terminal.editor_bridge import dispatch
from theorem_terminal.editor_assistance import assistance_action, prepare_editor_assistance
from theorem_terminal.editor_investigation import InvestigationStore, reserve_child
from theorem_terminal.openai_response import TransportResult


class EditorInvestigationTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        home = Path(temp.name)
        self.project = home / 'project'; self.project.mkdir()
        self.store = home / 'private'
        self.parent = home / 'parent.json'
        self.parent.write_bytes((Path(__file__).parent / 'fixtures/mechanical_model_call.json').read_bytes())
        self.child = home / 'child.json'
        self.base = dict(store=str(self.store), project_root=str(self.project))
        self.draft = dict(**self.base, state_revision=None,
            parent={'path': str(self.parent), 'revision': sha256(self.parent.read_bytes()).hexdigest()},
            passage_numbers=[1], contexts=[], question='What about α😀?', correction='Use β instead.',
            last_conclusion='One local reduction.', unresolved_issue='Final estimate.',
            model='deterministic-r3', output=str(self.child), exchange_id='editor-child')
        self.calls = []

    def call(self, method, **extra):
        return dispatch(dict(protocol=1, method=method, **self.base, **extra))

    def send(self, status='completed'):
        preview = dispatch(dict(protocol=1, method='prepare_assistance', draft=self.draft))['preview']
        def transport(*args):
            self.calls.append(args[2])
            if status == 'failed':
                raise OSError('deterministic failure')
            content = ({'type': 'refusal', 'refusal': 'No'} if status == 'refused' else
                       {'type': 'output_text', 'text': 'Child α😀.\n\nUnverified <script>text</script>.', 'annotations': []})
            response = dict(object='response', id='r-child', model='local-resolved',
                status='incomplete' if status == 'incomplete' else 'completed', output=[] if status == 'incomplete' else [
                dict(type='message', role='assistant', status='completed', content=[content])])
            return TransportResult(200, json.dumps(response).encode())
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'synthetic-key'}):
            return assistance_action(dict(method='send_assistance', draft=self.draft,
                preview=preview, confirmation='SEND'), transport=transport)

    def test_exact_child_preview_and_single_slot_for_all_terminal_outcomes(self):
        for status in ('completed', 'failed', 'refused', 'incomplete'):
            with self.subTest(status=status):
                self.child = self.child.with_name(status + '.json'); self.draft['output'] = str(self.child)
                self.draft['state_revision'] = self.call('investigation_state')['revision']
                before = self.parent.read_bytes()
                result = self.send(status)
                self.assertEqual(result['status'], status)
                active = result['investigation']['active']
                self.assertEqual(active['phase'], 'terminal')
                self.assertEqual(active['child']['record_revision'], sha256(self.child.read_bytes()).hexdigest())
                self.assertEqual(self.parent.read_bytes(), before)
                body = json.loads(self.calls[-1])
                self.assertNotIn('previous_response_id', body)
                self.assertIn('Use β instead.', json.dumps(body, ensure_ascii=False))
                self.assertEqual(json.loads(self.child.read_bytes())['in_reply_to'], active['parent']['id'])
                duplicate = deepcopy(self.draft); duplicate['output'] = str(self.child.with_name('duplicate.json'))
                duplicate['state_revision'] = result['investigation']['revision']
                with self.assertRaisesRegex(ValueError, 'active investigation'):
                    dispatch(dict(protocol=1, method='prepare_assistance', draft=duplicate))
                resumed = self.call('resume_investigation', revision=result['investigation']['revision'])
                self.assertEqual(resumed['active'], active)
                self.assertIn('Child terminal status: ' + status, resumed['body'])
                ended = self.call('end_investigation', revision=resumed['revision'])
                self.assertIsNone(ended['active'])
                self.assertTrue(self.child.exists())
        self.assertEqual(len(self.calls), 4)
        self.assertEqual((self.store / 'active.json').stat().st_mode & 0o777, 0o600)

    def test_summary_handoff_and_end_preserve_records_and_reject_stale_state(self):
        sent = self.send()['investigation']; previous = self.child.read_bytes()
        human = dict(sent['active']['summary'], question='New current question', unresolved_issue='Unsaved latest issue')
        handoff = self.call('investigation_handoff', revision=sent['revision'], summary=human)
        self.assertIn('Unsaved latest issue', handoff['body'])
        self.assertNotIn('Child α😀', handoff['body'])
        self.assertEqual(self.call('investigation_state')['active']['summary']['question'], self.draft['question'])
        saved = self.call('update_investigation', revision=sent['revision'], summary=human)
        with self.assertRaisesRegex(ValueError, 'changed'):
            self.call('end_investigation', revision=sent['revision'])
        self.call('end_investigation', revision=saved['revision'])
        self.assertEqual(self.child.read_bytes(), previous)
        self.assertIsNone(self.call('investigation_state')['active'])

    def test_changed_and_missing_records_keep_human_summary_without_repinning(self):
        sent = self.send()['investigation']; saved = deepcopy(sent['active'])
        for path in (self.parent, self.child):
            raw = path.read_bytes(); path.write_bytes(raw + b' ')
            resumed = self.call('resume_investigation', revision=sent['revision'])
            self.assertEqual(resumed['active'], saved)
            self.assertIn('missing or changed', resumed['body'])
            self.assertIn('Final estimate.', resumed['body'])
            path.write_bytes(raw)
        self.child.unlink()
        resumed = self.call('resume_investigation', revision=sent['revision'])
        self.assertEqual(resumed['active'], saved)
        self.assertIn('Child record missing or changed', resumed['body'])

    def test_pending_reservation_blocks_second_child_and_explicit_resume_recovers(self):
        prepared = prepare_editor_assistance(self.draft)
        store, reserved = reserve_child(prepared, self.draft)
        self.assertIsNone(reserved['active']['child']['id'])
        resumed = self.call('resume_investigation', revision=reserved['revision'])
        self.assertIn('unresolved', resumed['body'])
        self.assertEqual(resumed['revision'], reserved['revision'])
        # Simulate a process interrupted after immutable publication, before
        # pointer finalization. Reuse the same shared adapter and exact request.
        from theorem_terminal.assistance_actions import transmit_assistance
        def transport(*args):
            return TransportResult(200, json.dumps(dict(object='response',id='r',model='local-resolved',status='completed',output=[
                dict(type='message',role='assistant',status='completed',content=[
                    dict(type='output_text',text='Recovered exact terminal.',annotations=[])])])).encode())
        terminal = transmit_assistance(prepared, 'synthetic-key', transport=transport)
        self.assertIsNotNone(terminal.raw_record)
        resumed = self.call('resume_investigation', revision=reserved['revision'])
        self.assertEqual(resumed['active']['phase'], 'terminal')
        self.assertEqual(resumed['active']['child']['record_revision'], sha256(terminal.raw_record).hexdigest())
        self.assertIn('Recovered exact terminal.', resumed['body'])

    def test_pending_rejects_unrelated_destination_and_linked_child_as_parent(self):
        prepared = prepare_editor_assistance(self.draft)
        _, reserved = reserve_child(prepared, self.draft)
        self.child.write_bytes(self.parent.read_bytes())
        resumed = self.call('resume_investigation', revision=reserved['revision'])
        self.assertEqual(resumed['active']['phase'], 'pending')
        self.assertIn('does not match', resumed['body'])
        self.child.unlink(); self.call('end_investigation', revision=reserved['revision'])
        self.draft['state_revision'] = self.call('investigation_state')['revision']
        self.send()
        with self.assertRaisesRegex(ValueError, 'cannot be continued again'):
            dispatch(dict(protocol=1,method='investigation_parent',path=str(self.child)))

    def test_preflight_and_reservation_failure_never_call_transport(self):
        preview = dispatch(dict(protocol=1,method='prepare_assistance',draft=self.draft))['preview']
        with patch.dict(os.environ, {}, clear=True):
            result = assistance_action(dict(method='send_assistance',draft=self.draft,preview=preview,confirmation='SEND'),
                transport=lambda *args: self.fail('unexpected transport'))
        self.assertEqual(result['status'], 'not_sent'); self.assertFalse(self.store.exists())
        with patch('theorem_terminal.editor_investigation.save_mutable', side_effect=OSError('disk failure')):
            result = self.send()
        self.assertEqual(result['status'], 'not_sent')
        self.assertTrue(result['investigation']['blocked']); self.assertEqual(self.calls, [])
        self.assertFalse(self.child.exists())

    def test_end_failure_preserves_live_pointer_and_uncertain_disk_replacement(self):
        sent = self.send()['investigation']; old = (self.store/'active.json').read_bytes()
        with patch('theorem_terminal.editor_investigation.save_mutable', side_effect=OSError('before replace')):
            failed = self.call('end_investigation', revision=sent['revision'])
        self.assertTrue(failed['blocked']); self.assertEqual(failed['active'], sent['active'])
        self.assertEqual((self.store/'active.json').read_bytes(), old)
        with patch('theorem_terminal.mutable_files.sync_directory', side_effect=OSError('after replace')):
            failed = self.call('end_investigation', revision=sent['revision'])
        self.assertTrue(failed['blocked']); self.assertEqual(failed['active'], sent['active'])
        self.assertIsNone(self.call('investigation_state')['active'])
        self.assertTrue(self.child.exists())

    def test_wrong_root_unknown_fields_and_oversized_human_text_are_rejected(self):
        self.assertEqual(self.call('investigation_state'), {'active':None,'revision':None})
        self.assertFalse(self.store.exists())
        sent = self.send()['investigation']
        with self.assertRaises(ValueError):
            self.call('update_investigation', revision=sent['revision'], summary={'question':'bad'})
        human = dict(sent['active']['summary'], correction='x' * 16385)
        with self.assertRaisesRegex(ValueError, 'limit'):
            self.call('update_investigation',revision=sent['revision'],summary=human)
        with self.assertRaisesRegex(ValueError, 'outside'):
            dispatch(dict(protocol=1,method='investigation_state',project_root=str(self.project),store=str(self.project/'state')))
