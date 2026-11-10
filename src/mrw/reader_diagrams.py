"""Explicit isolated TikZ rendering and retained, exact-code SVG views.

Opening a note only partitions text and reads an existing rendering. It never
discovers tools, compiles, rewrites annotations or creates mathematical evidence.
"""
from copy import deepcopy
from hashlib import sha256
import base64
import math
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import xml.etree.ElementTree as ET

from .local_files import read_bounded
from .mutable_files import save_mutable
from .source_outlines import (OutlineStore, MAX_SOURCE, encoded, fields, identity,
                              now, revision, text)
from .workspace import strict_json

SCHEMA = 'mrw-reader-diagrams'
RENDERER = 'mrw-isolated-pdflatex-svg-v1'
MAX_INDEX = 128 * 1024
MAX_RENDERS = 128
MAX_CODE = 16384
MAX_SECONDS = 20
SVG_NS = 'http://www.w3.org/2000/svg'
XLINK = 'http://www.w3.org/1999/xlink'


def fragments(value):
    """Plain prose plus ordinary backtick/tilde fences, without executing Markdown.

    All fenced examples are excluded from equation rendering. TikZ uses the
    exact fence language and body; embedded fences of other languages stay code.
    """
    lines = re.findall(r'[^\r\n]*(?:\r\n|\r|\n|$)', value)
    if lines and lines[-1] == '':
        lines.pop()
    result, prose, i, number = [], [], 0, 0
    while i < len(lines):
        opener = re.fullmatch(r' {0,3}(`{3,}|~{3,})([^\r\n]*)[\r\n]*', lines[i])
        if not opener or ('`' in opener[2] and opener[1][0] == '`'):
            prose.append(lines[i]); i += 1; continue
        if prose:
            result.append(dict(kind='text', text=''.join(prose))); prose = []
        start, fence, info = i, opener[1], opener[2].strip()
        i += 1; body = i
        while i < len(lines) and not re.fullmatch(r' {0,3}' + re.escape(fence[0]) +
                                                '{' + str(len(fence)) + r',}[ \t]*[\r\n]*', lines[i]):
            i += 1
        closed = i < len(lines)
        source = ''.join(lines[body:i])
        i += int(closed)
        raw = ''.join(lines[start:i])
        if info == 'tikz' and closed:
            result.append(dict(kind='tikz', code=source, raw=raw, key=sha256(source.encode()).hexdigest(), index=number))
            number += 1
        else:
            result.append(dict(kind='code', text=raw))
    if prose:
        result.append(dict(kind='text', text=''.join(prose)))
    return result


def checked_svg(raw):
    """Accept a self-contained drawing profile, never arbitrary SVG/HTML/scripts."""
    if len(raw) > MAX_SOURCE or re.search(br'<!\s*(?:DOCTYPE|ENTITY)', raw, re.I):
        raise ValueError('Diagram SVG is too large or contains a document/entity declaration')
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as exc:
        raise ValueError('Diagram output is not valid SVG XML') from exc
    if root.tag != '{' + SVG_NS + '}svg':
        raise ValueError('Diagram output is not SVG')
    tags = {'svg', 'g', 'defs', 'path', 'symbol', 'use', 'clipPath', 'rect', 'circle', 'ellipse',
            'line', 'polyline', 'polygon', 'title', 'desc', 'linearGradient', 'radialGradient', 'stop'}
    presentation = {'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity',
                    'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray',
                    'stroke-dashoffset', 'opacity', 'clip-path', 'clip-rule', 'stop-color', 'stop-opacity'}
    attrs = presentation | {'id', 'transform', 'd', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r',
                            'rx', 'ry', 'points', 'width', 'height', 'viewBox', 'version', 'style',
                            'clipPathUnits', 'gradientUnits', 'gradientTransform', 'offset', 'fx', 'fy'}
    nodes = list(root.iter())
    if len(nodes) > 50000:
        raise ValueError('Diagram SVG exceeds its drawing limit')
    for node in nodes:
        if not isinstance(node.tag, str) or not node.tag.startswith('{' + SVG_NS + '}') or node.tag.split('}', 1)[1] not in tags:
            raise ValueError('Diagram SVG contains unsupported active or external content')
        styles = {}
        for name, value in list(node.attrib.items()):
            if name in ('href', '{' + XLINK + '}href'):
                if not re.fullmatch(r'#[A-Za-z_][\w.:-]*', value):
                    raise ValueError('Diagram SVG may reference only its local drawing definitions')
                continue
            if name not in attrs or re.search(r'(?:https?:|data:|file:|javascript:|//|@|\\)', value, re.I):
                raise ValueError('Diagram SVG contains unsupported attributes or external resources')
            rest = re.sub(r'url\(#[A-Za-z_][\w.:-]*\)', '', value)
            if re.search(r'url\s*\(', rest, re.I):
                raise ValueError('Diagram SVG contains an external style resource')
            if name == 'style':
                for declaration in value.split(';'):
                    if not declaration.strip():
                        continue
                    pair = declaration.split(':', 1)
                    if len(pair) != 2 or pair[0].strip() not in presentation:
                        raise ValueError('Diagram SVG contains unsupported styling')
                    styles[pair[0].strip()] = pair[1].strip()
        # SVG presentation attributes need no executable stylesheet or inline
        # CSS exception in the reader's nonce-only policy.
        node.attrib.pop('style', None)
        node.attrib.update(styles)
    try:
        box = [float(v) for v in re.split(r'[ ,]+', root.attrib['viewBox'].strip())]
        if len(box) != 4 or not all(math.isfinite(v) for v in box) or not all(0 < v <= 16384 for v in box[2:]):
            raise ValueError
    except (ValueError, KeyError):
        raise ValueError('Diagram SVG has an invalid or oversized view box') from None
    # Serializing a parsed tree discards processing instructions, comments and
    # declarations. The bytes installed/displayed are these validated bytes.
    return ET.tostring(root, encoding='utf-8')


def _tool(name):
    found = shutil.which(name)
    if not found:
        raise ValueError('Render diagram requires pdfLaTeX, Poppler (pdftocairo/pdfinfo) and bubblewrap on the Linux workspace host')
    path = Path(found).absolute()
    if not path.resolve().is_relative_to('/usr') or not path.resolve().read_bytes().startswith(b'\x7fELF'):
        raise ValueError('Diagram rendering requires trusted system tools under /usr, without command wrappers')
    if name == 'pdflatex' and path.resolve().name not in ('pdftex', 'pdflatex'):
        raise ValueError('Diagram rendering supports the installed pdfLaTeX engine only')
    if name != 'pdflatex' and path.resolve().name != name:
        raise ValueError('Diagram rendering requires the named installed system tool, without executable aliases')
    return str(path)


def _limits():
    import resource
    resource.setrlimit(resource.RLIMIT_CPU, (15, 15))
    resource.setrlimit(resource.RLIMIT_FSIZE, (16 * 1024 * 1024,) * 2)
    resource.setrlimit(resource.RLIMIT_AS, (1024 * 1024 * 1024,) * 2)
    resource.setrlimit(resource.RLIMIT_NOFILE, (128, 128))


def _sandbox(bwrap, directory, executable, arguments):
    command = [bwrap, '--unshare-all', '--die-with-parent', '--ro-bind', '/usr', '/usr',
               '--symlink', 'usr/bin', '/bin', '--symlink', 'usr/lib', '/lib',
               '--symlink', 'usr/lib64', '/lib64', '--proc', '/proc', '--dev', '/dev',
               '--tmpfs', '/tmp', '--dir', '/etc', '--dir', '/var', '--dir', '/var/lib', '--dir', '/var/cache']
    for path in ('/etc/texmf', '/etc/fonts', '/etc/ld.so.cache', '/var/lib/texmf', '/var/cache/fontconfig'):
        if Path(path).exists():
            command += ['--ro-bind', path, path]
    command += ['--bind', str(directory), '/work', '--chdir', '/work', '--clearenv',
                '--setenv', 'PATH', '/usr/bin:/bin', '--setenv', 'LANG', 'C.UTF-8',
                '--setenv', 'TEXMFHOME', '/nonexistent', '--setenv', 'TEXMFLOCAL', '/nonexistent',
                '--setenv', 'openin_any', 'p', '--setenv', 'openout_any', 'p', executable, *arguments]
    return command


def _run(command, directory, deadline, logfile):
    with logfile.open('wb') as log:
        os.fchmod(log.fileno(), 0o600)
        child = subprocess.Popen(command, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT,
                                 cwd=directory, env={}, start_new_session=True, preexec_fn=_limits)
        try:
            while child.poll() is None:
                files = [p for p in directory.rglob('*') if p.is_file()]
                if time.monotonic() > deadline or len(files) > 128 or sum(p.stat().st_size for p in files) > 48 * 1024 * 1024:
                    raise ValueError('Diagram rendering exceeded its time or output limit; no rendering was installed')
                time.sleep(.03)
            if child.returncode:
                tail = read_bounded(logfile, 16 * 1024 * 1024, 'diagram diagnostic').decode('utf-8', 'replace')[-2000:]
                raise ValueError('Diagram render failed; previous output is preserved. ' + tail)
        finally:
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGKILL)
            child.wait()


def compile_tikz(code):
    text(code, 'TikZ block', MAX_CODE)
    if not code.strip():
        raise ValueError('The TikZ block is empty')
    if not sys.platform.startswith('linux'):
        raise ValueError('Explicit diagram rendering requires a Linux/WSL workspace host; retained diagrams remain readable')
    compiler, converter, inspector, bwrap = (_tool(n) for n in ('pdflatex', 'pdftocairo', 'pdfinfo', 'bwrap'))
    # Preserve complete Obsidian-style bodies; a bare TikZ/tikz-cd environment
    # is wrapped for convenience. User code cannot switch the engine or shell.
    if '\\begin{document}' not in code:
        code = '\\begin{document}\n' + code + '\n\\end{document}\n'
    # A display equation needs vertical mode. The default TikZ preview wrapper
    # otherwise enters restricted horizontal mode and emits "Missing $" even
    # for a valid equation containing a TikZ picture.
    options = 'varwidth,border=3pt' if re.search(r'\\begin\{(?:equation|align|gather)\*?\}', code) else 'tikz,border=3pt'
    # Quiver exports use a named curve style, not TikZ's built-in bend keys.
    # Supply its attributed, pinned package inside the isolated work directory.
    quiver = bool(re.search(r'\bcurve\s*=|\\usepackage(?:\[[^\]]*\])?\{quiver\}', code))
    document = ('\\documentclass[' + options + ']{standalone}\n'
                '\\usepackage{amsmath,amssymb,tikz-cd}\n' +
                ('\\usepackage{quiver}\n' if quiver else '') + code)
    deadline = time.monotonic() + MAX_SECONDS
    with tempfile.TemporaryDirectory(prefix='mrw-tikz-') as temporary:
        directory = Path(temporary)
        if quiver:
            package = strict_json((Path(__file__).with_name('quiver.json')).read_bytes())
            raw = package['tex'].encode('utf-8')
            if sha256(raw).hexdigest() != 'dd729a5bcfbd66d154d643f832f5003f7ff91dbcd1a925d4014ba9d3aec576cc':
                raise ValueError('Invalid Quiver package')
            (directory / 'quiver.sty').write_bytes(raw)
        (directory / 'diagram.tex').write_text(document, encoding='utf-8')
        (directory / 'diagram.tex').chmod(0o600)
        _run(_sandbox(bwrap, directory, compiler, ['-interaction=nonstopmode', '-halt-on-error',
             '-no-shell-escape', '-no-parse-first-line', 'diagram.tex']), directory, deadline, directory / 'tex.log')
        _run(_sandbox(bwrap, directory, inspector, ['diagram.pdf']), directory, deadline, directory / 'pdf-info.log')
        pages = re.findall(r'^Pages:\s+(\d+)\s*$', (directory / 'pdf-info.log').read_text(), re.M)
        if not pages or pages[-1] != '1':
            raise ValueError('Use one diagram page per TikZ block; split multiple pages into separate fenced blocks. No partial diagram was installed')
        _run(_sandbox(bwrap, directory, converter, ['-svg', 'diagram.pdf', 'diagram.svg']),
             directory, deadline, directory / 'svg.log')
        raw = checked_svg(read_bounded(directory / 'diagram.svg', MAX_SOURCE, 'rendered diagram'))
    tools = {Path(p).name: sha256(Path(p).resolve().read_bytes()).hexdigest() for p in (compiler, converter)}
    return raw, tools


def _index(store):
    path = store.directory / 'diagram-renders.json'
    try:
        raw = read_bounded(path, MAX_INDEX, 'retained diagram index')
    except FileNotFoundError:
        raw = None
        value = dict(schema=SCHEMA, version=1, project_root=str(store.root), outline=store.id, renders=[])
    else:
        value = strict_json(raw)
    fields(value, {'schema', 'version', 'project_root', 'outline', 'renders'}, 'diagram index')
    if (value['schema'] != SCHEMA or type(value['version']) is not int or value['version'] != 1
            or value['project_root'] != str(store.root) or value['outline'] != store.id
            or not isinstance(value['renders'], list) or len(value['renders']) > MAX_RENDERS):
        raise ValueError('Retained diagram index has incompatible identity, version or size')
    seen = set()
    for item in value['renders']:
        fields(item, {'annotation', 'code', 'svg', 'renderer', 'at', 'tools'}, 'retained diagram')
        identity(item['annotation']); revision(item['code']); revision(item['svg'])
        key = (item['annotation'], item['code'])
        if key in seen or item['renderer'] != RENDERER:
            raise ValueError('Retained diagram identity is duplicated or incompatible')
        seen.add(key); text(item['at'], 'rendering time', 128)
        fields(item['tools'], {'pdflatex', 'pdftocairo'}, 'rendering tools')
        for digest in item['tools'].values():
            revision(digest)
    return path, raw, value


def _svg(store, item):
    raw = store.artifact(dict(revision=item['svg']))
    if checked_svg(raw) != raw:
        raise ValueError('Retained diagram is not its validated SVG representation')
    return raw


def dark_view(raw):
    """A derived appearance only: adapt monochrome ink, preserve other colors."""
    root = ET.fromstring(raw)
    root.attrib.setdefault('fill', '#e5e5e5')
    colors = {'black': '#e5e5e5', '#000': '#e5e5e5', '#000000': '#e5e5e5',
              'rgb(0,0,0)': '#e5e5e5', 'rgb(0%,0%,0%)': '#e5e5e5',
              'white': '#1e1e1e', '#fff': '#1e1e1e', '#ffffff': '#1e1e1e',
              'rgb(255,255,255)': '#1e1e1e', 'rgb(100%,100%,100%)': '#1e1e1e'}
    for node in root.iter():
        for name in ('fill', 'stroke'):
            value = re.sub(r'\s+', '', node.attrib.get(name, '')).lower()
            if value in colors:
                node.attrib[name] = colors[value]
    return checked_svg(ET.tostring(root, encoding='utf-8'))


def validate_retained(store):
    _, _, value = _index(store)
    for item in value['renders']:
        _svg(store, item)


def enrich(store, view):
    try:
        _, _, value = _index(store)
        saved = {(r['annotation'], r['code']): r for r in value['renders']}
        index_error = None
    except (OSError, ValueError) as exc:
        saved, index_error = {}, str(exc)
    notes = view['annotations'] + [n for r in view['regions'] for n in r['annotations']]
    displayed = 0
    for note in notes:
        note['fragments'] = fragments(note['text'])
        for block in note['fragments']:
            if block['kind'] != 'tikz':
                continue
            block['image'], block['dark_image'], block['error'] = None, None, index_error
            item = saved.get((note['id'], block['key']))
            if item:
                try:
                    svg = _svg(store, item)
                    displayed += len(svg)
                    if displayed > 8 * 1024 * 1024:
                        raise ValueError('This view exceeds its 8 MiB retained-diagram display limit; exact code is preserved')
                    block['image'] = 'data:image/svg+xml;base64,' + base64.b64encode(svg).decode('ascii')
                    block['dark_image'] = 'data:image/svg+xml;base64,' + base64.b64encode(dark_view(svg)).decode('ascii')
                    block['rendered_at'] = item['at']
                except (OSError, ValueError) as exc:
                    block['error'] = str(exc)


def diagram_action(request):
    store = OutlineStore(request['store'], request['project_root'], request['id'])
    store.expect(request['revision'])
    annotation = identity(request['annotation']); expected = revision(request['code'])
    notes = store.state['annotations'] + [n for r in store.state['regions'] for n in r['annotations']]
    note = next((n for n in notes if n['id'] == annotation), None)
    if note is None:
        raise ValueError('The saved annotation is missing; save/reopen it before rendering')
    block = next((b for b in fragments(note['text']) if b['kind'] == 'tikz' and b['key'] == expected), None)
    if block is None:
        raise ValueError('The exact saved TikZ block changed; save/reopen it before rendering')
    path, previous, value = _index(store)
    validate_retained(store)
    if len(value['renders']) >= MAX_RENDERS and not any(r['annotation'] == annotation and r['code'] == expected for r in value['renders']):
        raise ValueError('This outline already retains its maximum 128 diagram renderings')
    svg, tools = compile_tikz(block['code'])
    item = dict(annotation=annotation, code=expected, svg=sha256(svg).hexdigest(), renderer=RENDERER, at=now(), tools=tools)
    value = deepcopy(value)
    value['renders'] = [r for r in value['renders'] if (r['annotation'], r['code']) != (annotation, expected)] + [item]
    candidate = encoded(value)
    if len(candidate) > MAX_INDEX:
        raise ValueError('Retained diagram index exceeds its size limit')
    try:
        store.retain(svg)
        save_mutable(path, candidate, previous=previous, lock_root=store.base / 'locks')
    except (OSError, ValueError) as exc:
        return dict(blocked=True, write_error=str(exc))
    return store.view()
