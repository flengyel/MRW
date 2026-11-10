# Source plugins: use and authoring (API 1)

**Import Source…** lists enabled sources. Stacks Project and Kerodon retain their
direct Commands buttons. nLab is a built-in named-page adapter. **Add Source
Plugin…** registers either a local JSON profile or an explicitly selected
installed Python adapter. No window reload or VSIX rebuild is required.
**Manage Source Plugins…** enables, disables or removes registrations.

A profile is data selecting an installed parser family. An adapter is trusted
installed code running with your account's permissions. Its Python subprocess
is not a sandbox. MRW does not discover executable workspace files or execute
code supplied by a website. Merely listing installed entry points reads package
metadata; selecting and confirming **Enable adapter** loads the selected code.

## A working external profile

Download [gerby-example.json](../examples/source-plugins/gerby-example.json) to
any directory outside the MRW installation. In **Add Source Plugin…**, choose
**Data-only source profile**, then that file. Use **Import Source… → External
Gerby profile example** and enter `0004`. Review the revision/hash and destination,
then import. This deliberately uses Kerodon's supported HTML with a separate
example namespace; it does not claim support for another site.

The complete profile is the manifest below. `gerby-html-v1` expects the current
Kerodon section structure, including complete tagged statements and proof
articles. Different selectors, asset handling or revision conventions need a
parser change, not a guessed configuration. `nlab-html-v1` expects nLab revision
bodies and headings. The built-in `stacks-git-v1` acquisition is not configurable
as a data-only profile. Clowder and PreTeXt are candidates, not supported imports.

## A working external Python adapter

Copy [the adapter template](../examples/source-plugins/adapter) outside MRW.
Create a Python 3.11+ environment and install it there, for example:

```sh
python3 -m venv ~/venvs/mrw-sources
~/venvs/mrw-sources/bin/python -m pip install /path/to/copied/adapter
```

Set **MRW: Python Executable** (`mrw.pythonExecutable`, User or Remote setting)
to that environment's Python. Use **Add Source Plugin… → Installed Python
adapter → example (mrw-example-source)** and confirm the trusted-code prompt.
Then **Import Source… → External Python adapter example → 0004**. Ordinary
reading needs no PySide6 or installation of MRW into that environment: the bridge
loads its bundled core, while Python finds the external entry point in the
configured interpreter's installed packages. Other optional tools retain their
own requirements.

The entry-point group is `mrw.sources`. Each named entry points to a zero-argument
factory returning an adapter with `.manifest` and these methods:

| Method | Input and result |
| --- | --- |
| `recognize(value)` | User input string → bool; no acquisition |
| `normalize(value)` | Input → `{itemId, revision, fragment, canonicalUrl}` |
| `plan(item, host)` | Normalized item, core acquisition helper → acquisition plan |
| `parse(item, resources, plan)` | Item, `{name: bytes}`, plan → display model |
| `live_url(item)` | Item → declared-origin HTTPS URL of the current page |

`ProfileAdapter` in `mrw.source_adapters` supplies these methods for the installed
parser families; the template subclasses it. For a new format, override `plan`
and `parse`, or implement all five operations. Public helpers in `mrw.source_api`
include `API_VERSION`, `SourceDocument`, `source_span`, `normalize`, `qualified`
and `page_url`. Parsers receive no saved-store object. They return data; the core
validates, hashes and persists it.

The plan calls `host.fetch(name, url, limit=2097152)` for every dependency, including
revision-discovery responses. It returns:

```python
{
    "primary": "page.html",
    "revision": {"kind": "dated-snapshot", "label": None, "verified": False},
    "canonicalUrl": "https://example.org/page/Example"
}
```

Core uses `live_url` for current-page navigation. A revision URL belongs in the
item and retained resource URL; these are separate from that current-page URL.
Revision kinds are `git`, `upstream-revision` and `dated-snapshot`. An optional
`identityKey` string supplies a deterministic acquisition key (used to preserve
existing Stacks/Kerodon identities). Its authority is still constrained by source
namespace, exact bytes and private scope; it cannot overwrite a conflicting source.

Fetching allows at most eight resources, 2 MiB combined UTF-8 bytes, 25 seconds
per response, and exact declared HTTPS origins. Redirects, credential URLs,
proxies and fragments in fetch URLs are rejected. No downloaded scripts, remote
media fetch or automatic TeX compilation is provided. Executable adapters are
trusted code and can perform their own I/O; these helper limits do not sandbox
them. Use the helper to retain complete acquisition provenance.

## Manifest

All fields are required; unknown fields/API versions are rejected:

```json
{
  "apiVersion": 1,
  "pluginId": "example.gerby-profile",
  "pluginVersion": "1.0.0",
  "sourceId": "gerby-example",
  "name": "External Gerby profile example",
  "parser": "gerby-html-v1",
  "origins": ["https://kerodon.net"],
  "urlRules": {"identifier": "tag", "itemPath": "/tag/{id}", "revisionPath": null},
  "capabilities": {"onlineView": true, "savedImport": true, "sectionSelection": false, "revisionLookup": false},
  "attribution": {"authors": "Jacob Lurie", "license": "No license statement supplied by the retrieved page", "url": "https://kerodon.net"}
}
```

`sourceId` is a lowercase namespace (letters, digits, hyphens, max 64). It does
not change when a plugin/API version changes. `pluginId` names the producer;
`pluginVersion` names its implementation revision. Conflicting namespace
registrations are rejected, including a removed namespace claimed by a different
plugin. The four capabilities are independent. A hashed snapshot need not claim
an upstream numbered revision or support embedding.

`origins[0]` is the canonical website. `itemPath` contains one `{id}`;
`revisionPath`, when supplied, also contains `{revision}`. `identifier` is `tag`
(four alphanumeric characters) or `page` (case-sensitive Unicode name). Other
adapter formats can implement normalization themselves. Spaces in named-page
URLs use `+`, literal plus uses `%2B`; retained item IDs percent-encode spaces,
plus and slash reversibly. Fragments never become part of item identity.

Registrations are local to the workspace host, normally
`~/.config/mrw/source-plugins.json` (`XDG_CONFIG_HOME` is respected). The optional
absolute `MRW_SOURCE_PLUGIN_REGISTRY` environment path is useful for isolated
checks. Registration data is not loaded from a note or repository. Malformed
individual registrations produce diagnostics without disabling unrelated sources.
Manage can disable/remove built-ins as well; removal reserves the namespace and
never deletes saved records. Re-enabling a missing adapter still requires its
installed Python package.

## Display model 1

A parser returns:

```python
{
    "displayVersion": 1, "title": "Example", "format": "html",
    "parts": [{
        "key": "definition", "itemId": "Example", "anchor": "Definition",
        "role": "context", "title": "Definition",
        "span": source_span(source, start, end),
        "tokens": [{"kind": "text", "text": "Exact source projection"}],
        "warning": None
    }],
    "choices": [{"id": "whole", "title": "Whole page", "first": 0, "last": 1}],
    "default": "whole"
}
```

`source` is `SourceDocument.from_bytes('/page.html', resources['page.html'])`.
`source_span` takes half-open Unicode offsets in the BOM-free original text,
keeps original line endings, and returns the source SHA-256 and scalar range.
Every part must map to a nonempty exact span (max 256 KiB). There are at most
128 parts, 129 choices and 2 MiB of display data. These larger bounds apply to
new plugin snapshots; earlier ordinary-source formats retain their bounds.
nLab's inspected page has 66 headings, which required lifting the new import
bound above 64. Choices select `[first,last)` including subsections. A supplied
fragment must resolve uniquely; `default` identifies its choice.

Roles are `context`, `statement`, `proof`; formats `html` and `tex`. Optional
`navigation` contains `chapter`, `chapter_tag`, `section_number`, `previous`,
`next`; each neighbour is null or `{title,tag}`. This preserves Stacks chapter
navigation without a source-specific reader branch.

Supported tokens:

- `text`, `raw`, `math`: `text` string (`math` may include `display: true`).
- `paragraph`: separator.
- `em`, `strong`, `code`, `group`, `slogan`: `children` tokens.
- `list`: `ordered` boolean and `items` arrays of tokens.
- `reference`: `tag`, `label`, `retained` boolean; core supplies source namespace.
- `link`: `url` (HTTP(S) or local `#fragment`) and `label`.
- `anchor`: original `name` for exact local navigation.
- `mathml`, `svg`: `text` containing restricted inert XML, validated by both core
  and reader. `mrw.source_rendering.safe_tree` converts parsed nodes with a
  whitelist, rewrites local SVG IDs/references and uses theme color for black ink.

Source HTML is never inserted directly. Active elements, external resources,
foreign objects and event handlers are rejected. Unsupported mathematics/media
must emit a visible `raw` fallback at its location and a part `warning`. The
original bytes remain available. The supported vocabularies/attributes and size,
nesting and token bounds are defined in `mrw.source_rendering` and rechecked in
`vscode/src/sourceRendering.js`; new constructs require a model/API extension,
not arbitrary HTML execution.

## Retention and upgrades

The core writes `mrw.source-snapshot` version 1 with original resource hashes,
URLs and bytes, item, revision evidence, UTC acquisition time, selected scope,
attribution, display/mappings and producer API/plugin/version. Existing source
records and links are preserved; this is not a storage migration.

Offline reopening, annotations and exact copied citations use only this retained
snapshot. Disabling, removing or upgrading a plugin does not reparse it. Identical
reimport reopens its existing record and annotations. Changed bytes create a new
record. **Reparse Saved Source…** explicitly creates a derived copy from retained
bytes with the current plugin; it requires the plugin and supports new plugin
snapshots. Earlier format imports remain readable but do not offer this reparse
path. No annotations are moved to the copy. Its producer and `derivedFrom` identify
the relationship; earlier references keep working. A changed selected heading
that no longer exists causes an error, not a fallback to the whole page.

These checks validate structure, byte provenance and navigation. They do not
check mathematical correctness or certify an upstream revision label.
