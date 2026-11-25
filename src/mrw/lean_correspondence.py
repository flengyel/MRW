"""Read retained declaration facts from an already-built, pinned Lean project."""

from hashlib import sha256
import json
from pathlib import Path
import re
import tempfile
from time import monotonic

from .local_files import read_bounded
from .route_checker import process
from .workspace import strict_json


SOURCE_LIMIT = 2 * 1024 * 1024
SOURCE_BUDGET = 96 * 1024 * 1024
MAX_INPUTS = 5000
MAX_LOCATION = 128 * 1024
MAX_OUTPUT = 2 * 1024 * 1024
MAX_TIME = 90
NAME = re.compile(r"(?:[^\W\d][\w']*|[0-9]+)(?:\.(?:[^\W\d][\w']*|[0-9]+))*")
PIN = re.compile(r"leanprover/lean4:(?:v[0-9]+\.[0-9]+\.[0-9]+(?:-rc[0-9]+)?|nightly-[0-9]{4}-[0-9]{2}-[0-9]{2})")
COMMIT = re.compile(r"[a-f0-9]{40}|[a-f0-9]{64}")
DIGEST = re.compile(r"[a-f0-9]{64}")
MARKER = b"MRW_DECLARATION "

PROBE = r'''
import Lean
import {{MODULE}}

open Lean Meta Elab Command

namespace MRW.CorrespondenceReader

def binderKind : BinderInfo → String
  | .default => "explicit"
  | .implicit => "implicit"
  | .strictImplicit => "strict_implicit"
  | .instImplicit => "instance"

def declarationKind : ConstantInfo → String
  | .axiomInfo _ => "axiom"
  | .defnInfo _ => "definition"
  | .thmInfo _ => "theorem"
  | .opaqueInfo _ => "opaque"
  | .quotInfo _ => "quotient"
  | .inductInfo _ => "inductive"
  | .ctorInfo _ => "constructor"
  | .recInfo _ => "recursor"

def position (p : Position) : Json :=
  Json.mkObj [("line", toJson (p.line - 1)), ("column", toJson p.column)]

def moduleOf (env : Environment) (name : Name) : Option Name := do
  let index ← env.getModuleIdxFor? name
  env.header.moduleNames[index.toNat]?

def location (moduleName : Option Name) (name : Name) : MetaM Json := do
  let some moduleName := moduleName | return Json.null
  let some ranges ← findDeclarationRanges? name | return Json.null
  return Json.mkObj [("module", toJson moduleName.toString),
    ("start", position ranges.range.pos), ("end", position ranges.range.endPos)]

def inspect (name : Name) : MetaM Json := do
  let env ← getEnv
  let imports := toJson (env.header.moduleNames.map Name.toString)
  let some declaration := env.find? name
    | return Json.mkObj [("missing", toJson true), ("imports", imports)]
  let type := declaration.type
  let normal ← ppExpr type
  let explicit ← withOptions (fun opts => (opts.setBool `pp.explicit true).setBool `pp.universes true) (ppExpr type)
  let binders ← forallTelescope type fun args _ => args.mapM fun arg => do
    let localDecl ← arg.fvarId!.getDecl
    let binderType ← ppExpr localDecl.type
    return Json.mkObj [("name", toJson localDecl.userName.toString),
      ("kind", toJson (binderKind localDecl.binderInfo)), ("type", toJson binderType.pretty)]
  let axioms ← collectAxioms name
  let dependencies ← type.getUsedConstants.mapM fun dependency => do
    let moduleName := moduleOf env dependency
    return Json.mkObj [
      ("name", toJson dependency.toString),
      ("kind", toJson ((env.find? dependency).map declarationKind)),
      ("module", toJson (moduleName.map Name.toString)),
      ("source_location", ← location moduleName dependency)]
  return Json.mkObj [
    ("imports", imports), ("source_location", ← location (moduleOf env name) name),
    ("declaration_type", Json.mkObj [("default", toJson normal.pretty), ("explicit", toJson explicit.pretty)]),
    ("signature_hypotheses", toJson binders), ("axiom_dependencies", toJson (axioms.map Name.toString)),
    ("direct_dependencies", toJson dependencies)]

run_cmd do
  let value ← liftTermElabM (inspect {{DECLARATION}}.toName)
  liftIO (IO.println ("MRW_DECLARATION " ++ value.compress))

end MRW.CorrespondenceReader
'''


def _name(value):
    return isinstance(value, str) and len(value) <= 512 and NAME.fullmatch(value)


def _hash(raw):
    return sha256(raw).hexdigest()


def _directory(value):
    path = Path(value)
    if not path.is_absolute() or path.resolve(strict=True) != path or not path.is_dir():
        raise ValueError("Select a canonical local Lean project directory.")
    return path


def _system_tool(name):
    path = Path("/usr/bin") / name
    try:
        with path.open("rb") as stream:
            if path.resolve(strict=True) != path or stream.read(4) != b"\x7fELF":
                raise OSError()
    except OSError as error:
        raise ValueError(f"Install the system {name} executable on the Linux workspace host.") from error
    return str(path)


def _installed_toolchain(pin):
    from os import access, environ, X_OK

    home = Path(environ.get("ELAN_HOME", str(Path.home() / ".elan"))).expanduser()
    # Validate the pin before constructing a filesystem path.
    name = pin.replace("/", "--").replace(":", "---")
    try:
        root = (home / "toolchains" / name).resolve(strict=True)
        for tool in ("lake", "lean"):
            executable = root / "bin" / tool
            if executable.resolve(strict=True) != executable or not executable.is_file() or not access(executable, X_OK):
                raise OSError()
            with executable.open("rb") as stream:
                if stream.read(4) != b"\x7fELF":
                    raise OSError()
        if not (root / "lib/lean/Init.olean").is_file():
            raise OSError()
    except (OSError, RuntimeError) as error:
        raise ValueError(f"Lean toolchain {pin} is missing or incomplete. Run elan toolchain install {pin} first.") from error
    return root


def _commit(root):
    git = _system_tool("git")
    env = {"PATH": "/usr/bin:/bin", "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null",
           "GIT_TERMINAL_PROMPT": "0", "GIT_OPTIONAL_LOCKS": "0"}
    try:
        raw, _ = process([git, "rev-parse", "--verify", "HEAD^{commit}"], cwd=root, env=env,
                         timeout=5, limit=1024)
        commit = raw.decode("ascii").strip()
    except (OSError, ValueError) as error:
        raise ValueError("Select a Lean project with a local Git commit.") from error
    if not COMMIT.fullmatch(commit):
        raise ValueError("The Lean project commit could not be identified.")
    return commit


def _sandbox(project, toolchain, scratch, overlays):
    sandbox = [_system_tool("bwrap"), "--unshare-all", "--die-with-parent",
               "--ro-bind", "/usr", "/usr", "--symlink", "usr/bin", "/bin",
               "--symlink", "usr/lib", "/lib", "--symlink", "usr/lib64", "/lib64",
               "--proc", "/proc", "--dev", "/dev", "--tmpfs", "/tmp",
               "--ro-bind", str(project), str(project),
               "--ro-bind", str(toolchain), str(toolchain),
               "--ro-bind", str(scratch), "/mrw-probe"]
    for directory in overlays:
        # Lake's rehash writes generated hash sidecars. Only the anonymous
        # upper layer is writable, and only under the build output directory.
        sandbox += ["--overlay-src", str(directory), "--tmp-overlay", str(directory)]
    return sandbox + ["--chdir", str(project), "--clearenv", "--setenv", "HOME", "/tmp",
                      "--setenv", "TMPDIR", "/tmp", "--setenv", "LANG", "C.UTF-8",
                      "--setenv", "PATH", f"{toolchain}/bin:/usr/bin:/bin",
                      "--setenv", "GIT_TERMINAL_PROMPT", "0"]


def _search_roots(environment, key, project, toolchain):
    paths = []
    for value in environment.get(key, "").split(":"):
        if not value:
            continue
        path = Path(value)
        try:
            resolved = path.resolve(strict=True)
        except OSError:
            continue
        if not resolved.is_dir():
            continue
        if not resolved.is_relative_to(project) and not resolved.is_relative_to(toolchain):
            raise ValueError("Select a Lean project with dependencies inside the project or its toolchain.")
        if resolved != path:
            raise ValueError("Lean search directories must not be redirected.")
        paths.append(resolved)
    if len(paths) > 64:
        raise ValueError("Lean search directories exceed their limit.")
    return paths


def _build_roots(build_paths, project):
    roots = set()
    for folder in build_paths:
        if folder.is_relative_to(project):
            if folder.name != "lean" or folder.parent.name != "lib" or folder.parent.parent == project:
                raise ValueError("Lean build outputs must use a Lake lib/lean directory beneath the project.")
            roots.add(folder.parent.parent)
    return sorted(roots)


def _files(roots, modules, suffix, deadline):
    for module in modules:
        if monotonic() >= deadline:
            raise ValueError("Lean declaration reading exceeded its time limit.")
        if not _name(module):
            continue
        relative = "/".join(module.split(".")) + suffix
        for root in roots:
            file = root / relative
            if file.is_file():
                if file.resolve(strict=True) != file:
                    raise ValueError("A Lean input was redirected.")
                yield module, file
                break


def _read_source(file):
    return read_bounded(file, SOURCE_LIMIT, "Lean source")


def _location(value, sources, content):
    if value is None or value["module"] not in sources:
        return None
    file = sources[value["module"]]
    raw = content[file]
    source = raw.decode("utf-8")
    offsets = [0, *(match.end() for match in re.finditer("\n", source))]

    def offset(position):
        line, column = position["line"], position["column"]
        if type(line) is not int or type(column) is not int or not 0 <= line < len(offsets):
            raise ValueError("Lean declaration range has an invalid line or column.")
        first = offsets[line]
        end = len(source) if line + 1 == len(offsets) else offsets[line + 1] - 1
        if not 0 <= column <= end - first:
            raise ValueError("Lean declaration range exceeds its source line.")
        return first + column

    start, end = offset(value["start"]), offset(value["end"])
    if end <= start or end - start > MAX_LOCATION:
        return None
    return {"path": str(file), "revision": _hash(raw), "start": value["start"],
            "end": value["end"], "text": source[start:end]}


def _read_inputs(paths, deadline):
    if len(paths) > MAX_INPUTS:
        raise ValueError("The Lean project's source inputs exceed their count limit.")
    content, size = {}, 0
    for path in sorted(paths):
        if monotonic() >= deadline:
            raise ValueError("Lean declaration reading exceeded its time limit.")
        raw = _read_source(path)
        size += len(raw)
        if size > SOURCE_BUDGET:
            raise ValueError("The Lean project's source inputs exceed their byte limit.")
        content[path] = raw
    return content


def _derived(root, pin, commit, content):
    manifest = content[root / "lake-manifest.json"]
    return {"toolchain": pin, "manifest_digest": _hash(manifest), "commit": commit,
            "inputs": [{"path": str(file), "digest": _hash(raw)} for file, raw in content.items()]}


def collect(project, module, declaration):
    """Read one declaration inside an offline sandbox after checking its build."""

    if not _name(module) or not _name(declaration):
        raise ValueError("Enter a Lean module and the fully qualified declaration name.")
    root = _directory(project)
    pin_file = root / "lean-toolchain"
    pin = _read_source(pin_file).decode("ascii").strip()
    if not PIN.fullmatch(pin):
        raise ValueError("The Lean project must pin an exact leanprover/lean4 release or nightly.")
    toolchain = _installed_toolchain(pin)
    configuration = [root / f"lakefile.{kind}" for kind in ("toml", "lean")
                     if (root / f"lakefile.{kind}").exists()]
    if not configuration:
        raise ValueError("Select a Lean project with a Lake configuration.")
    required = {pin_file, root / "lake-manifest.json", *configuration}
    commit = _commit(root)
    deadline = monotonic() + MAX_TIME
    guidance = f"Build the project first (lake build {module})."
    try:
        metadata = _read_inputs(required, deadline)
    except FileNotFoundError as error:
        raise ValueError(guidance) from error
    if metadata[pin_file].decode("ascii").strip() != pin:
        raise ValueError("The Lean toolchain pin changed during the read.")
    identity = {"version": 1, "project": str(root), "module": module, "declaration": declaration}

    with tempfile.TemporaryDirectory(prefix="mrw-lean-declaration-") as temporary:
        scratch = Path(temporary).resolve()
        probe = PROBE.replace("{{MODULE}}", module).replace("{{DECLARATION}}", json.dumps(declaration, ensure_ascii=False))
        (scratch / "Declaration.lean").write_text(probe, encoding="utf-8")

        def lake(arguments, overlays=()):
            remaining = deadline - monotonic()
            if remaining <= 0:
                raise ValueError("Lean declaration reading exceeded its time limit.")
            return process(_sandbox(root, toolchain, scratch, overlays) + [str(toolchain / "bin/lake"),
                           "--no-build", "--no-cache", *arguments], cwd=root, env={},
                           timeout=remaining, limit=MAX_OUTPUT)[0]

        try:
            raw = lake(["env", "/usr/bin/env", "-0"])
        except ValueError as error:
            raise ValueError(guidance + " A read-only bubblewrap sandbox and a prepared Lake environment are required. " + str(error)) from error
        environment = dict(entry.split("=", 1) for entry in raw.decode("utf-8").split("\0") if "=" in entry)
        build_paths = _search_roots(environment, "LEAN_PATH", root, toolchain)
        source_paths = _search_roots(environment, "LEAN_SRC_PATH", root, toolchain)
        source_paths.append(toolchain / "src/lean")
        overlays = _build_roots(build_paths, root)
        query = ["--rehash", "--json", "query", f"+{module}:olean"]
        try:
            built = Path(strict_json(lake(query, overlays)))
        except (TypeError, ValueError) as error:
            raise ValueError(guidance + " A current compiled import closure and bubblewrap temporary overlays are required. " + str(error)) from error
        if not built.is_absolute():
            built = root / built
        selected = next(_files(build_paths, [module], ".olean", deadline), (None, None))[1]
        if selected != built or not built.is_relative_to(root):
            raise ValueError(guidance)
        initial_artifact = read_bounded(built, 32 * 1024 * 1024, "compiled Lean module")
        raw = lake(["env", str(toolchain / "bin/lean"), "/mrw-probe/Declaration.lean"])
        messages = [line[len(MARKER):] for line in raw.split(b"\n") if line.startswith(MARKER)]
        if len(messages) != 1:
            raise ValueError("Lean did not return one declaration fact record.")
        result = strict_json(messages[0])
        imports = result.pop("imports")
        if not isinstance(imports, list) or len(imports) > 22000 or module not in imports:
            raise ValueError("Lean did not return a bounded import closure containing the selected module.")
        sources = dict(_files(source_paths, imports, ".lean", deadline))
        if module not in sources or not sources[module].is_relative_to(root):
            raise ValueError("The built Lean module has no matching project source.")
        closure = {file for file in sources.values() if file.is_relative_to(root)}
        # Bind source bytes before checking the closure again, so concurrent
        # edits cannot silently pair a retained range with a prior .olean.
        content = _read_inputs(required | closure, deadline)
        latest_built = Path(strict_json(lake(query, overlays)))
        if not latest_built.is_absolute():
            latest_built = root / latest_built
        if (latest_built != built or read_bounded(built, 32 * 1024 * 1024, "compiled Lean module") != initial_artifact or
                _read_inputs(required | closure, deadline) != content or _commit(root) != commit or
                any(content[path] != raw for path, raw in metadata.items())):
            raise ValueError("The Lean project or its build changed during the read. Try again.")
        result.update(identity, derived_from=_derived(root, pin, commit, content))
        if result.get("missing") is not True:
            locations = [result, *result["direct_dependencies"]]
            extra_sources = {sources[location["module"]] for item in locations
                             if (location := item["source_location"]) and location["module"] in sources}
            content.update(_read_inputs(extra_sources - content.keys(), deadline))
            location_bytes = 0
            for item in locations:
                location = _location(item["source_location"], sources, content)
                if location is not None:
                    location_bytes += len(location["text"].encode())
                    if location_bytes > MAX_OUTPUT:
                        raise ValueError("Lean declaration locations exceed their output limit.")
                item["source_location"] = location
            result["axiom_dependencies"].sort()
        validate(result)
        if len(json.dumps(result, ensure_ascii=False).encode()) > MAX_OUTPUT:
            raise ValueError("Lean declaration facts exceed their output limit.")
        return result


def _location_ok(value):
    if value is None:
        return True
    if (not isinstance(value, dict) or set(value) != {"path", "revision", "start", "end", "text"} or
            not _path_ok(value["path"]) or not _matches(DIGEST, value["revision"]) or
            not isinstance(value["text"], str) or len(value["text"]) > MAX_LOCATION):
        return False
    for position in (value["start"], value["end"]):
        if (not isinstance(position, dict) or set(position) != {"line", "column"} or
                any(type(n) is not int or not 0 <= n <= SOURCE_LIMIT for n in position.values())):
            return False
    return (value["start"]["line"], value["start"]["column"]) < (value["end"]["line"], value["end"]["column"])


def _path_ok(value):
    return (isinstance(value, str) and 0 < len(value) <= 8192 and "\x00" not in value and Path(value).is_absolute()
            and ".." not in Path(value).parts)


def _matches(pattern, value):
    return isinstance(value, str) and pattern.fullmatch(value)


def validate(facts):
    """Validate the versioned reader protocol without inspecting the project."""

    basic = {"version", "project", "module", "declaration", "derived_from"}
    fields = {"declaration_type", "signature_hypotheses", "axiom_dependencies", "direct_dependencies", "source_location"}
    if not isinstance(facts, dict):
        raise ValueError("Invalid Lean declaration facts.")
    missing = facts.get("missing") is True
    if (set(facts) != basic | ({"missing"} if missing else fields) or type(facts["version"]) is not int or
            facts["version"] != 1 or not _path_ok(facts["project"]) or not _name(facts["module"]) or
            not _name(facts["declaration"])):
        raise ValueError("Invalid Lean declaration facts.")
    origin = facts["derived_from"]
    if (not isinstance(origin, dict) or set(origin) != {"toolchain", "manifest_digest", "commit", "inputs"} or
            not _matches(PIN, origin["toolchain"]) or not _matches(DIGEST, origin["manifest_digest"]) or
            not _matches(COMMIT, origin["commit"]) or not isinstance(origin["inputs"], list) or
            not 0 < len(origin["inputs"]) <= MAX_INPUTS):
        raise ValueError("Invalid Lean declaration provenance.")
    project = Path(facts["project"])
    seen = set()
    local_configuration = {project / name for name in ("lakefile.toml", "lake-manifest.json", "lean-toolchain")}
    for item in origin["inputs"]:
        if (not isinstance(item, dict) or set(item) != {"path", "digest"} or not _path_ok(item["path"]) or
                not Path(item["path"]).is_relative_to(project) or
                (Path(item["path"]).suffix != ".lean" and Path(item["path"]) not in local_configuration) or
                not _matches(DIGEST, item["digest"]) or item["path"] in seen):
            raise ValueError("Invalid Lean declaration input.")
        seen.add(item["path"])
    if missing:
        return facts
    rendered = facts["declaration_type"]
    if (not isinstance(rendered, dict) or set(rendered) != {"default", "explicit"} or
            any(not isinstance(value, str) or not value or len(value) > SOURCE_LIMIT for value in rendered.values()) or
            not _location_ok(facts["source_location"])):
        raise ValueError("Invalid Lean declaration type or source range.")
    kinds = {"explicit", "implicit", "strict_implicit", "instance"}
    binders, axioms, dependencies = (facts[key] for key in ("signature_hypotheses", "axiom_dependencies", "direct_dependencies"))
    if any(not isinstance(items, list) or len(items) > 4000 for items in (binders, axioms, dependencies)):
        raise ValueError("Invalid Lean declaration binders or dependencies.")
    if any(not isinstance(binder, dict) or set(binder) != {"kind", "name", "type"} or
           any(not isinstance(value, str) or len(value) > SOURCE_LIMIT for value in binder.values()) or
           binder["kind"] not in kinds for binder in binders):
        raise ValueError("Invalid Lean declaration binder.")
    if any(not isinstance(name, str) or not name or len(name) > 8192 for name in axioms):
        raise ValueError("Invalid Lean axiom dependency.")
    if any(not isinstance(item, dict) or set(item) != {"kind", "name", "module", "source_location"} or
           not isinstance(item["name"], str) or not item["name"] or len(item["name"]) > 8192 or
           any(item[key] is not None and (not isinstance(item[key], str) or len(item[key]) > 8192) for key in ("kind", "module")) or
           not _location_ok(item["source_location"]) for item in dependencies):
        raise ValueError("Invalid Lean type dependency.")
    return facts


def status(facts):
    """Check retained input identities without opening a Lean environment."""

    validate(facts)
    try:
        root = _directory(facts["project"])
        origin = facts["derived_from"]
        if _commit(root) != origin["commit"]:
            return {"state": "changed"}
        deadline = monotonic() + MAX_TIME
        size = 0
        for item in origin["inputs"]:
            file = Path(item["path"])
            if monotonic() >= deadline or file.resolve(strict=True) != file:
                return {"state": "unavailable"}
            raw = _read_source(file)
            size += len(raw)
            if size > SOURCE_BUDGET:
                return {"state": "unavailable"}
            if _hash(raw) != item["digest"]:
                return {"state": "changed"}
    except (OSError, ValueError, RuntimeError):
        return {"state": "unavailable"}
    return {"state": "current"}
