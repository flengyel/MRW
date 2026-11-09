"""Derived diagram output never edits prose or supplies mathematical evidence."""
from copy import deepcopy
from hashlib import sha256
import os
from pathlib import Path
import tempfile
import time
import unittest
from unittest.mock import patch

from theorem_terminal.editor_bridge import dispatch
from theorem_terminal.reader_diagrams import checked_svg, compile_tikz, dark_view, fragments, validate_retained
from theorem_terminal.source_outlines import OutlineStore

SVG = checked_svg(b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M0 0L20 20"/></svg>')
TOOLS = dict(pdflatex='1' * 64, pdftocairo='2' * 64)
CODE = '\\begin{tikzcd}\nA \\arrow[r,"f"] & B\n\\end{tikzcd}\n'
NOTE = 'Reader α😀 explanation.\r\n```tikz\r\n' + CODE + '```\r\nQuestion for later.'


class ReaderDiagramTests(unittest.TestCase):
    def test_document_render_has_no_store_or_note_mutation(self):
        with patch('theorem_terminal.reader_diagrams.compile_tikz', return_value=(SVG, TOOLS)) as compiler:
            result = dispatch(dict(protocol=1, method='document_render_diagram', code=CODE))
        compiler.assert_called_once_with(CODE)
        self.assertTrue(result['light'].startswith('data:image/svg+xml;base64,'))
        self.assertNotEqual(result['light'], result['dark'])
        with self.assertRaises(ValueError):
            dispatch(dict(protocol=1, method='document_render_diagram', code=CODE, path='unrelated.md'))

    def setUp(self):
        temporary = tempfile.TemporaryDirectory(); self.addCleanup(temporary.cleanup)
        self.home = Path(temporary.name); self.project = self.home / 'project'; self.project.mkdir()
        self.source = self.project / 'source.md'; self.source.write_text('An ordinary source.')
        self.base = dict(store=str(self.home / 'private'), project_root=str(self.project))
        self.saved = self.call('outline_create', path=str(self.source), source_revision=sha256(self.source.read_bytes()).hexdigest())
        self.id = self.saved['outline']['id']
        self.edit(NOTE)

    def call(self, method, **extra):
        return dispatch(dict(protocol=1, method=method, **self.base, **extra))

    def edit(self, value):
        old = self.saved['outline']['annotations']
        self.saved = self.call('outline_mutate', id=self.id, revision=self.saved['revision'], change=dict(
            kind='annotation', region=None, id=old[0]['id'] if old else None,
            purpose='explanation', text=value, origin='human_work', author='Reader'))
        self.note = self.saved['outline']['annotations'][0]
        self.block = next(b for b in self.note['fragments'] if b['kind'] == 'tikz')

    def render(self):
        result = self.call('outline_render_diagram', id=self.id, revision=self.saved['revision'],
                           annotation=self.note['id'], code=self.block['key'])
        if 'outline' in result:
            self.saved = result
        return result

    def test_fences_preserve_unicode_endings_duplicate_blocks_and_code_examples(self):
        value = 'α😀\r\n```text\n```tikz\nnot executable\n```\n' + NOTE + '\n~~~tikz\n' + CODE + '~~~\n'
        parts = fragments(value)
        self.assertEqual(''.join(p.get('raw', p.get('text', '')) for p in parts), value)
        blocks = [p for p in parts if p['kind'] == 'tikz']
        self.assertEqual(len(blocks), 2); self.assertEqual(blocks[0]['key'], blocks[1]['key'])
        self.assertEqual(blocks[0]['code'], CODE)
        self.assertFalse(any(p['kind'] == 'tikz' for p in fragments('    ```tikz\nx\n    ```')))
        self.assertFalse(any(p['kind'] == 'tikz' for p in fragments('```tikz\nunclosed')))

    def test_render_preserves_note_and_source_bytes_and_reopen_never_compiles(self):
        store = OutlineStore(self.base['store'], self.base['project_root'], self.id)
        before = (store.directory / 'outline.json').read_bytes()
        source = self.source.read_bytes()
        with patch('theorem_terminal.reader_diagrams.compile_tikz', return_value=(SVG, TOOLS)) as compiler:
            self.render(); compiler.assert_called_once_with(CODE)
        self.assertEqual((store.directory / 'outline.json').read_bytes(), before)
        self.assertEqual(self.source.read_bytes(), source)
        self.assertEqual(self.saved['outline']['annotations'][0]['text'], NOTE)
        self.source.unlink()
        with patch('theorem_terminal.reader_diagrams.compile_tikz', side_effect=AssertionError('Implicit compiler')):
            reopened = self.call('outline_load', id=self.id)
            block = next(b for b in reopened['outline']['annotations'][0]['fragments'] if b['kind'] == 'tikz')
            self.assertTrue(block['image'].startswith('data:image/svg+xml;base64,'))
            validate_retained(OutlineStore(self.base['store'], self.base['project_root'], self.id))
        self.assertEqual((store.directory / 'diagram-renders.json').stat().st_mode & 0o777, 0o600)

    def test_changed_code_cannot_acquire_earlier_rendering_and_exact_undo_can(self):
        with patch('theorem_terminal.reader_diagrams.compile_tikz', return_value=(SVG, TOOLS)):
            self.render()
        self.edit(NOTE.replace('"f"', '"g"'))
        self.assertIsNone(self.block['image'])
        self.edit(NOTE)
        self.assertIsNotNone(self.block['image'])

    def test_stale_revision_code_annotation_and_wrong_workspace_refuse_before_compiler(self):
        request = dict(id=self.id, revision=self.saved['revision'], annotation=self.note['id'], code=self.block['key'])
        with patch('theorem_terminal.reader_diagrams.compile_tikz', side_effect=AssertionError('Unexpected compiler')):
            for key, value in [('revision', 'a' * 64), ('annotation', '11111111-1111-1111-1111-111111111111'), ('code', 'f' * 64)]:
                with self.subTest(key=key), self.assertRaises(ValueError):
                    self.call('outline_render_diagram', **{**request, key: value})
            with self.assertRaises(ValueError):
                dispatch(dict(protocol=1, method='outline_render_diagram', **{**self.base, 'project_root': str(self.home)}, **request))

    def test_missing_or_corrupt_retained_svg_reports_error_without_replacement(self):
        with patch('theorem_terminal.reader_diagrams.compile_tikz', return_value=(SVG, TOOLS)):
            self.render()
        store = OutlineStore(self.base['store'], self.base['project_root'], self.id)
        blob = store.blob(sha256(SVG).hexdigest()); blob.unlink()
        with patch('theorem_terminal.reader_diagrams.compile_tikz', side_effect=AssertionError('Implicit replacement')):
            result = self.call('outline_load', id=self.id)
            block = next(b for b in result['outline']['annotations'][0]['fragments'] if b['kind'] == 'tikz')
            self.assertIsNotNone(block['error']); self.assertIsNone(block['image'])
            with self.assertRaises(OSError): self.render()
        self.assertFalse(blob.exists())

    def test_bad_index_is_visible_without_initializing_a_replacement(self):
        path = Path(self.base['store']) / self.id / 'diagram-renders.json'
        path.write_bytes(b'{}')
        result = self.call('outline_load', id=self.id)
        block = next(b for b in result['outline']['annotations'][0]['fragments'] if b['kind'] == 'tikz')
        self.assertIsNotNone(block['error']); self.assertEqual(path.read_bytes(), b'{}')
        with self.assertRaises(ValueError): self.render()

    def test_failed_render_preserves_previous_svg_and_all_note_bytes(self):
        with patch('theorem_terminal.reader_diagrams.compile_tikz', return_value=(SVG, TOOLS)):
            self.render()
        root = Path(self.base['store']) / self.id
        before = {p.name: p.read_bytes() for p in root.iterdir() if p.is_file()}
        with patch('theorem_terminal.reader_diagrams.compile_tikz', side_effect=ValueError('Bad TikZ')):
            with self.assertRaisesRegex(ValueError, 'Bad TikZ'): self.render()
        self.assertEqual({p.name: p.read_bytes() for p in root.iterdir() if p.is_file()}, before)

    def test_uncertain_publication_reports_blocked_without_confirmed_success(self):
        with patch('theorem_terminal.reader_diagrams.compile_tikz', return_value=(SVG, TOOLS)), \
             patch('theorem_terminal.reader_diagrams.save_mutable', side_effect=OSError('Directory sync failed')):
            result = self.render()
        self.assertTrue(result['blocked']); self.assertNotIn('outline', result)
        self.assertFalse((Path(self.base['store']) / self.id / 'diagram-renders.json').exists())

    def test_svg_profile_refuses_active_external_malformed_and_oversized_content(self):
        for body in ('<script/>', '<foreignObject/>', '<image href="file:///outside"/>',
                     '<use href="https://example.org/a"/>', '<path style="fill:url(https://example.org/a)"/>',
                     '<path onclick="bad()"/>', '<path style="font-family:secret"/>'):
            with self.subTest(body=body), self.assertRaises(ValueError):
                checked_svg(('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">' + body + '</svg>').encode())
        for raw in (b'<svg', b'<!DOCTYPE svg><svg/>', b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 99999 1"/>'):
            with self.assertRaises(ValueError): checked_svg(raw)
        self.assertEqual(checked_svg(SVG), SVG)

    def test_dark_appearance_adapts_only_monochrome_and_preserves_retained_bytes(self):
        import xml.etree.ElementTree as ET
        raw=checked_svg(b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path fill="black" stroke="red" d="M0 0L1 1"/><rect fill="white" width="2" height="2"/></svg>')
        before=bytes(raw);dark=dark_view(raw);root=ET.fromstring(dark)
        self.assertEqual(root[0].attrib['fill'],'#e5e5e5');self.assertEqual(root[0].attrib['stroke'],'red')
        self.assertEqual(root[1].attrib['fill'],'#1e1e1e');self.assertEqual(raw,before)
        self.assertEqual(checked_svg(dark),dark)


@unittest.skipUnless(os.environ.get('THEOREM_TERMINAL_DIAGRAM_TESTS') == '1', 'Opt-in normal-host isolated TikZ rendering')
class NativeDiagramTests(unittest.TestCase):
    def test_display_equation_and_quiver_curve(self):
        code = '\\begin{equation}\\begin{tikzpicture}\\draw[->] (0,0)--(1,0);\\end{tikzpicture}\\end{equation}'
        svg, _ = compile_tikz(code)
        self.assertGreater(len(svg), 100)
        svg, _ = compile_tikz('\\begin{tikzcd} A \\arrow[r,curve={height=12pt}] & B \\end{tikzcd}')
        self.assertGreater(len(svg), 100)

    def test_native_commutative_diagram_and_external_pdf_stream_refusal(self):
        svg, tools = compile_tikz('\\begin{document}\n' + CODE + '\\end{document}')
        self.assertGreater(len(svg), 1000); self.assertEqual(checked_svg(svg), svg)
        self.assertNotIn(b'style=', svg)
        self.assertEqual(set(tools), {'pdflatex', 'pdftocairo'})
        with tempfile.TemporaryDirectory() as directory:
            private = Path(directory) / 'outside.txt'; private.write_text('Private external fixture')
            code = '\\immediate\\pdfobj stream file{' + str(private) + '}\n' + CODE
            with self.assertRaises(ValueError): compile_tikz(code)
            self.assertEqual(private.read_text(), 'Private external fixture')

    def test_native_infinite_tex_stops_without_publication(self):
        start = time.monotonic()
        with patch('theorem_terminal.reader_diagrams.MAX_SECONDS', .2):
            with self.assertRaisesRegex(ValueError, 'time or output limit'):
                compile_tikz('\\begin{document}\\loop\\iftrue\\repeat\\end{document}')
        self.assertLess(time.monotonic() - start, 5)

    def test_native_colors_and_multipage_refusal(self):
        import xml.etree.ElementTree as ET
        code='\\begin{tikzpicture}\\draw[red,thick] (0,0)--(1,0);\\draw[blue] (0,0)--(0,1);\\end{tikzpicture}'
        svg,_=compile_tikz(code)
        colors={n.attrib['stroke'].replace(' ','') for n in ET.fromstring(svg).iter() if 'stroke' in n.attrib}
        self.assertIn('rgb(100%,0%,0%)',colors);self.assertIn('rgb(0%,0%,100%)',colors)
        dark_colors={n.attrib['stroke'].replace(' ','') for n in ET.fromstring(dark_view(svg)).iter() if 'stroke' in n.attrib}
        self.assertEqual(colors,dark_colors)
        with self.assertRaisesRegex(ValueError,'one diagram page'):
            compile_tikz('\\begin{document}\n'+code+'\n'+code+'\n\\end{document}')
