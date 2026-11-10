"""Trusted user-local tool settings and explicit, shell-free process handoffs."""

from copy import deepcopy
from dataclasses import asdict, dataclass, field
import os
from pathlib import Path
import shlex
import re
import shutil
import string
import subprocess

from .local_files import read_bounded
from .mutable_files import private_directory, update_mutable
from .workspace import WorkspaceError, json_bytes, strict_json, user_state_root


@dataclass
class ToolSettings:
    editor: list[str] = field(default_factory=list)
    jupyter: list[str] = field(default_factory=list)
    tex_engine: str = ''
    recent_projects: list[str] = field(default_factory=list)


def validate_arguments(arguments, allowed, required=()):
    if not isinstance(arguments, list) or not arguments or len(arguments) > 64:
        raise WorkspaceError('A tool template must be a nonempty argument list')
    fields = set()
    try:
        for arg in arguments:
            if not isinstance(arg, str) or '\0' in arg or len(arg) > 4096:
                raise ValueError
            for _, name, spec, conversion in string.Formatter().parse(arg):
                if name is not None:
                    if name not in allowed or spec or conversion:
                        raise ValueError
                    fields.add(name)
    except ValueError as exc:
        raise WorkspaceError('Use only the displayed plain tool placeholders') from exc
    if not set(required) <= fields or '{' in arguments[0] or '}' in arguments[0]:
        raise WorkspaceError('Tool template is missing a required file or line placeholder')
    # Credentials are neither supported tool arguments nor settings. Do not echo
    # rejected values in errors. No environment values are serialized.
    for name, value in os.environ.items():
        if value and len(value) >= 8 and any(word in name.upper() for word in ('TOKEN', 'SECRET', 'PASSWORD', 'API_KEY')):
            if any(value in arg for arg in arguments):
                raise WorkspaceError('Credentials cannot be stored in tool settings')


def parse_command(command):
    try:
        return shlex.split(command, posix=True)
    except ValueError as exc:
        raise WorkspaceError('Tool command contains unmatched quotes') from exc


def resolve_executable(name):
    path = shutil.which(name)
    if path is None:
        raise WorkspaceError('Configured executable is unavailable; check Tools settings')
    # Preserve the selected basename: TeX engines dispatch by argv[0] and may
    # share one symlink target. Never resolve pdflatex into pdftex here.
    return str(Path(path).absolute())



def validated_tex_executable(name, project=None):
    """Accept trusted pdfTeX tools only; reject engine-switching aliases."""
    selected = Path(name).name.lower()
    if selected not in ('latexmk', 'pdflatex'):
        raise WorkspaceError('Only latexmk with pdfLaTeX, or pdfLaTeX, is supported. LuaLaTeX is disabled without an OS sandbox')
    executable = Path(resolve_executable(name))
    target = executable.resolve()
    allowed = ('latexmk',) if selected == 'latexmk' else ('pdftex', 'pdflatex')
    if target.name.lower() not in allowed or (project and (target.is_relative_to(project) or executable.is_relative_to(project))):
        raise WorkspaceError('TeX executable alias or project-local executable is outside the accepted engine boundary')
    with target.open('rb') as stream:
        header = stream.read(128)
    if selected == 'pdflatex' and not header.startswith(b'\x7fELF'):
        raise WorkspaceError('Select an installed native pdfTeX executable, not a command wrapper')
    if selected == 'latexmk' and not re.match(rb'^#![^\n]*\bperl(?:\s|$)', header):
        raise WorkspaceError('Select the installed Perl latexmk script, not a command wrapper')
    return str(executable)


def expand_arguments(arguments, **values):
    validate_arguments(arguments, set(values))
    return [resolve_executable(arguments[0]), *(arg.format_map(values) for arg in arguments[1:])]


def local_tool_environment():
    """Retain desktop and tool search settings; exclude provider credentials."""
    allowed = {'PATH', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'SYSTEMROOT',
               'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'TMPDIR', 'LANG', 'LC_ALL',
               'DISPLAY', 'WAYLAND_DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR',
               'DBUS_SESSION_BUS_ADDRESS', 'TERM', 'COLORTERM', 'SHELL',
               'LD_LIBRARY_PATH', 'FONTCONFIG_PATH', 'FONTCONFIG_FILE',
               'TEXMFHOME', 'TEXMFLOCAL', 'TEXMFCNF'}
    return {name: value for name, value in os.environ.items() if name in allowed}


class SettingsStore:
    def __init__(self, state_root=None):
        self.root = (state_root or user_state_root()).resolve()
        self.path = self.root / 'settings.json'
        self.previous = read_bounded(self.path, 65536, 'user tool settings') if self.path.exists() else None
        self.settings = self.decode(self.previous)
        self.baseline = deepcopy(self.settings)
        self.pending_recent = []

    @staticmethod
    def decode(raw):
        if raw is None:
            return ToolSettings()
        data = strict_json(raw)
        if not isinstance(data, dict) or set(data) != {'version', *ToolSettings.__dataclass_fields__} or type(data['version']) is not int or data['version'] != 1:
            raise WorkspaceError('Unsupported user tool settings')
        for name in ('editor', 'jupyter'):
            if data[name]:
                validate_arguments(data[name], {'file', 'line', 'column'}, {'file', 'line'} if name == 'editor' else {'file'})
            elif data[name] != []:
                raise WorkspaceError('Invalid tool template')
        if not isinstance(data['tex_engine'], str) or '\0' in data['tex_engine']:
            raise WorkspaceError('Invalid TeX executable setting')
        if not isinstance(data['recent_projects'], list) or len(data['recent_projects']) > 12 or any(not isinstance(p, str) or not Path(p).is_absolute() for p in data['recent_projects']):
            raise WorkspaceError('Invalid recent project list')
        return ToolSettings(**{key: data[key] for key in ToolSettings.__dataclass_fields__})


    def remember_project(self, root):
        self.pending_recent = [root, *(p for p in self.pending_recent if p != root)]
        self.settings.recent_projects = [root, *(p for p in self.settings.recent_projects if p != root)][:12]

    def save(self):
        def merge(raw):
            latest = self.decode(raw)
            for name in ('editor', 'jupyter', 'tex_engine'):
                local, base, disk = (getattr(obj, name) for obj in (self.settings, self.baseline, latest))
                if local != base:
                    if disk != base and disk != local:
                        raise WorkspaceError('Tool setting changed in another process; reload settings before changing it')
                    setattr(latest, name, local)
            latest.recent_projects = [*self.pending_recent,
                *(p for p in latest.recent_projects if p not in self.pending_recent)][:12]
            return json_bytes({'version': 1, **asdict(latest)})
        private_directory(self.root)
        raw = update_mutable(self.path, merge, limit=65536, lock_root=self.root / 'locks')
        self.previous = raw
        self.settings = self.decode(raw)
        self.baseline = deepcopy(self.settings)
        self.pending_recent.clear()

    def configure(self, name, command):
        if name in ('editor', 'jupyter'):
            arguments = parse_command(command) if command.strip() else []
            if arguments:
                validate_arguments(arguments, {'file', 'line', 'column'}, {'file', 'line'} if name == 'editor' else {'file'})
            value = arguments
        elif name == 'tex_engine':
            value = command.strip()
            if value:
                validate_arguments([value], set())
                validated_tex_executable(value)
        else:
            raise WorkspaceError('Unknown tool setting')
        previous = getattr(self.settings, name)
        setattr(self.settings, name, value)
        try:
            self.save()
        except (OSError, ValueError):
            setattr(self.settings, name, previous)
            raise

    def editor_arguments(self, path, line, column):
        arguments = self.settings.editor
        if not arguments:
            command = os.environ.get('VISUAL') or os.environ.get('EDITOR') or ''
            if not command:
                raise WorkspaceError('Configure an editor in Tools, or set VISUAL or EDITOR')
            arguments = parse_command(command)
            if not any('{file}' in arg for arg in arguments):
                # Conventional Vim commands can receive a current-line address.
                # Other editors need an explicit template to avoid guessing flags.
                if any(Path(arg).name.lower() in ('vim', 'vim.tiny', 'nvim', 'gvim', 'vim.exe', 'nvim.exe') for arg in arguments):
                    arguments = [*arguments, '+{line}', '-c', 'normal! {column}|', '{file}']
                else:
                    raise WorkspaceError('Configure a template with {file}, {line} and optionally {column} for this editor')
        validate_arguments(arguments, {'file', 'line', 'column'}, {'file', 'line'})
        return expand_arguments(arguments, file=str(path), line=line, column=column)


def launch_tool(arguments, cwd):
    """Called exclusively by direct editor/notebook actions; never during restore."""
    return subprocess.Popen(arguments, cwd=cwd, shell=False,
                            env=local_tool_environment(), start_new_session=True)
