"""One bounded clipboard object for attributed, source-linked study questions.

Format and source binding only; no mathematical assessment or model call.
"""
from .proof_graph import fields as _fields, text as _text, items as _items


def fields(*args):
    try:
        return _fields(*args)
    except ValueError as error:
        raise ValueError("Invalid study-question fields") from error


def text(*args):
    try:
        return _text(*args)
    except ValueError as error:
        raise ValueError("Study-question text is empty, invalid or too long") from error


def items(*args, **kwargs):
    try:
        return _items(*args, **kwargs)
    except ValueError as error:
        raise ValueError("Study-question list is empty or exceeds its bound") from error


def validate_questions(value, sources):
    fields(value, {'version', 'sources', 'questions'})
    if type(value['version']) is not int or value['version'] != 1:
        raise ValueError('Unsupported question format')
    if value['sources'] != sources:
        raise ValueError('Question sources differ from the exact handoff')
    allowed = {s['reference'] for s in sources}
    for question in items(value['questions'], 10, empty=False):
        fields(question, {'activity', 'prompt', 'answer', 'hints', 'references', 'author', 'origin'})
        if question['activity'] not in ('definition', 'hypotheses', 'missing_step', 'argument', 'application'):
            raise ValueError('Unsupported study activity')
        text(question['prompt']); text(question['author'], 160)
        if question['origin'] not in ('human', 'ai_proposal'):
            raise ValueError('Identify question origin')
        if question['answer'] is not None:
            fields(question['answer'], {'text', 'author', 'origin'})
            text(question['answer']['text']); text(question['answer']['author'], 160)
            if question['answer']['origin'] not in ('human', 'ai_proposal'):
                raise ValueError('Identify reference-answer origin')
        for hint in items(question['hints'], 4):
            text(hint, 4096)
        refs = items(question['references'], 16, empty=False)
        if any(not isinstance(ref, str) or ref not in allowed for ref in refs) or len(set(refs)) != len(refs):
            raise ValueError('Question references leave the selected source context')
    return value
