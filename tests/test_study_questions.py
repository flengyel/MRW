import copy
import unittest
from mrw.study_questions import validate_questions


class StudyQuestionsTests(unittest.TestCase):
    def setUp(self):
        self.sources = [{'reference': 'mrw-outline:v1/exact', 'source_revision': 'a' * 64, 'sha256': 'b' * 64}]
        self.value = {'version': 1, 'sources': self.sources, 'questions': [{
            'activity': 'missing_step', 'prompt': 'Explain this inference.',
            'answer': {'text': 'Proposed explanation.', 'author': 'Codex companion', 'origin': 'ai_proposal'},
            'hints': [], 'references': ['mrw-outline:v1/exact'], 'author': 'Codex companion', 'origin': 'ai_proposal'}]}

    def test_exact_source_binding_attribution_and_unavailable_answer(self):
        self.assertEqual(validate_questions(self.value, self.sources), self.value)
        self.value['questions'][0]['answer'] = None
        self.assertIsNone(validate_questions(self.value, self.sources)['questions'][0]['answer'])

    def test_bounds_and_unknown_fields_reject_without_mutation(self):
        for mutate in (lambda x: x.update(extra=True), lambda x: x.update(version=True),
                       lambda x: x.update(questions=x['questions'] * 11),
                       lambda x: x['questions'][0].update(references=['unselected']),
                       lambda x: x['questions'][0].update(origin='checked'),
                       lambda x: x['questions'][0]['answer'].update(author='')):
            candidate = copy.deepcopy(self.value)
            mutate(candidate)
            with self.assertRaises(ValueError):
                validate_questions(candidate, self.sources)
        self.assertEqual(len(self.value['questions']), 1)
