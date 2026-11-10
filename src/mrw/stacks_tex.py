"""Small, nonexecuting TeX display adapter; exact source remains separate.

Only supported prose/list structure is interpreted. Unknown constructs display
the complete original fragment with a precise warning, never a shortened proof.
Math is handed as data to the bundled, restricted KaTeX MathML renderer.
"""
import re


class UnsupportedTex(ValueError):
    pass


def comment_mask(value):
    """Keep scalar offsets/line endings while masking unescaped TeX comments."""
    out = list(value)
    at = 0
    while (start := value.find('%', at)) >= 0:
        slash = start - 1
        while slash >= 0 and value[slash] == '\\':
            slash -= 1
        if (start - slash - 1) % 2 == 0:
            match = re.search(r'\r|\n', value[start:])
            end = start + match.start() if match else len(value)
            out[start:end] = ' ' * (end - start)
            at = end
        else:
            at = start + 1
    return ''.join(out)


def group(value, start):
    while start < len(value) and value[start].isspace():
        start += 1
    if start >= len(value) or value[start] != '{':
        raise UnsupportedTex('Expected a braced TeX argument')
    depth, at = 1, start + 1
    while at < len(value):
        if value[at] == '\\':
            at += 2
            continue
        if value[at] == '{':
            depth += 1
        elif value[at] == '}':
            depth -= 1
            if not depth:
                return value[start + 1:at], at + 1
        at += 1
    raise UnsupportedTex('Unclosed braced TeX argument')


def display_tokens(raw, references):
    """An inert DOM recipe, not downloaded HTML, Markdown or executable TeX."""
    try:
        return _Display(raw, references).parse(), None
    except UnsupportedTex as exc:
        return [{'kind': 'raw', 'text': raw}], str(exc)


class _Display:
    def __init__(self, raw, references, depth=0):
        if depth > 20:
            raise UnsupportedTex('TeX display nesting exceeds 20 levels')
        self.raw, self.refs, self.depth, self.at = raw, references, depth, 0

    def nested(self, raw):
        return _Display(raw, self.refs, self.depth + 1).parse()

    def parse(self, end=None, list_items=False):
        nodes, text = [], []

        def flush():
            if text:
                nodes.append({'kind': 'text', 'text': ''.join(text)})
                text.clear()

        while self.at < len(self.raw):
            if len(nodes) > 10000:
                raise UnsupportedTex('TeX display exceeds 10,000 fragments')
            tail = self.raw[self.at:]
            if end and tail.startswith(end):
                flush()
                self.at += len(end)
                return nodes
            if list_items and re.match(r'\\item\b', tail):
                flush()
                return nodes
            char = self.raw[self.at]
            if char == '%':
                match = re.search(r'\r\n|\r|\n', tail)
                self.at += match.end() if match else len(tail)
                continue
            if char == '$' or tail.startswith((r'\(', r'\[')):
                flush()
                opener = '$$' if tail.startswith('$$') else '$' if char == '$' else tail[:2]
                closer = {'$$': '$$', '$': '$', r'\(': r'\)', r'\[': r'\]'}[opener]
                start = self.at + len(opener)
                match = re.search(r'(?<!\\)' + re.escape(closer), self.raw[start:])
                if match is None:
                    raise UnsupportedTex('Unclosed mathematical delimiter ' + opener)
                math = self.raw[start:start + match.start()]
                if len(math) > 65536:
                    raise UnsupportedTex('One mathematical expression exceeds 65,536 characters')
                nodes.append({'kind': 'math', 'text': math, 'display': opener in ('$$', r'\[')})
                self.at = start + match.end()
                continue
            if tail.startswith(r'\begin'):
                flush()
                env, after = group(self.raw, self.at + len(r'\begin'))
                self.at = after
                closing = r'\end{' + env + '}'
                if env in ('enumerate', 'itemize'):
                    items = []
                    while True:
                        while self.at < len(self.raw) and self.raw[self.at].isspace():
                            self.at += 1
                        if self.raw.startswith(closing, self.at):
                            self.at += len(closing)
                            break
                        match = re.match(r'\\item\b', self.raw[self.at:])
                        if not match:
                            raise UnsupportedTex('Expected an item or end in ' + env)
                        self.at += match.end()
                        child = _Display(self.raw[self.at:], self.refs, self.depth + 1)
                        items.append(child.parse(end=closing, list_items=True))
                        consumed = child.at
                        ended = child.raw[:consumed].endswith(closing)
                        self.at += consumed
                        if ended:
                            break
                    nodes.append({'kind': 'list', 'ordered': env == 'enumerate', 'items': items})
                elif env == 'slogan':
                    child = _Display(self.raw[self.at:], self.refs, self.depth + 1)
                    children = child.parse(end=closing)
                    self.at += child.at
                    nodes.append({'kind': 'slogan', 'children': children})
                else:
                    raise UnsupportedTex('Unsupported display environment ' + env)
                continue
            if char == '\\':
                match = re.match(r'\\([A-Za-z]+|.)', tail, re.S)
                if not match:
                    raise UnsupportedTex('Trailing backslash')
                command = match[1]
                self.at += match.end()
                if command in ('noindent', 'smallskip', 'medskip', 'bigskip', 'par'):
                    flush()
                    if command != 'noindent':
                        nodes.append({'kind': 'paragraph'})
                elif command in ('label', 'ref', 'emph', 'textit', 'textbf', 'texttt'):
                    argument, self.at = group(self.raw, self.at)
                    if command == 'label':
                        continue
                    flush()
                    if command == 'ref':
                        nodes.append({'kind': 'reference', 'label': argument, **self.refs.get(argument, {'tag': None})})
                    else:
                        nodes.append({'kind': {'emph': 'em', 'textit': 'em', 'textbf': 'strong', 'texttt': 'code'}[command],
                                      'children': self.nested(argument)})
                elif command in ('%', '&', '_', '#', '$', '{', '}'):
                    text.append(command)
                elif command in (' ', ',', ';'):
                    text.append(' ')
                elif command == '\\':
                    flush()
                    nodes.append({'kind': 'paragraph'})
                else:
                    raise UnsupportedTex('Unsupported prose command \\' + command)
                continue
            if char == '{':
                flush()
                argument, self.at = group(self.raw, self.at)
                style = re.match(r'\s*\\(it|bf|tt)\b\s*', argument)
                nodes.append({'kind': {'it': 'em', 'bf': 'strong', 'tt': 'code'}[style[1]] if style else 'group',
                              'children': self.nested(argument[style.end():] if style else argument)})
                continue
            if char == '}':
                raise UnsupportedTex('Unmatched closing brace')
            if char in '\r\n':
                match = re.match(r'(?:\r\n|\r|\n)(?:[ \t]*(?:\r\n|\r|\n))+', tail)
                if match:
                    flush()
                    nodes.append({'kind': 'paragraph'})
                    self.at += match.end()
                else:
                    text.append(' ')
                    self.at += 2 if tail.startswith('\r\n') else 1
                continue
            text.append('\u00a0' if char == '~' else char)
            self.at += 1
        if end:
            raise UnsupportedTex('Unclosed display environment ' + end)
        flush()
        return nodes
