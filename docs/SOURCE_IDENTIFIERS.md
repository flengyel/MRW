# Source identity, revisions and exact passages

A stable identifier names an item in a source. It does not identify an immutable
revision of that item's contents. Retained references distinguish four fields:

| Field | Example | Meaning |
| --- | --- | --- |
| Qualified item ID | `stacks-project:08ZH`, `kerodon:0004` | Source namespace and source-local tag |
| Content revision | Retained SHA-256; Stacks Project also retains a Git commit | The exact acquired bytes |
| Passage | Outline/region identity and scalar start/end range | The exact quotation within those bytes |
| Private scope | Workspace/store identity | Authority to resolve retained material |

Keep the qualified identifier intact in document links, backlinks, study/research
records, handoffs and resumption. Never collapse `kerodon:0004` and
`stacks-project:0004` into one bare tag. Human labels are descriptive, not identity
authority. Prefix validation must agree with verified retained provenance and
the exact quoted span.

## Navigation and retention

`[[kerodon:0004]]` and canonical website links identify current published items.
Following them opens the official page in the browser. They make no
promise about content revision. No source is acquired merely to resolve a link.

New retained published references include the qualified ID:

```text
mrw-outline:v2/kerodon:000A/<scope>/<outline>/<source-sha256>/<region>/<start>-<end>
```

The hash and exact scalar range retain their meaning. Outline-level
links omit the region/range. A prefix cannot excuse a hash mismatch or authorize
another private scope. A canonical URL cannot substitute for a failed retained
reference. Changing a published page creates a distinct retained snapshot;
earlier citations still resolve their original bytes and passage.

Older v1 links remain supported. The reader derives their published identity
from the retained manifest. Explicit published-item backlink scans can resolve
up to 256 distinct v1 references in the selected notes folder, read-only.
Missing stores, wrong scope and scan limits are reported as incomplete results;
identities are never guessed from prose or rewritten into original notes.
Backlinks group published item identities across revisions, while every retained
occurrence keeps its own full reference and revision. This grouping does not
assert that those quotations are identical.

## Source adapters

| Namespace | Explicit acquisition | Retained provenance |
| --- | --- | --- |
| `stacks-project` | Official Git chapter, tag map, license and preamble at one commit | Git commit, exact file hashes, UTC time, source spans |
| `kerodon` | One official section/subsection HTML page | Exact response hash, UTC time, HTML source spans |

Stacks Project and Kerodon use [Gerby](https://gerby-project.github.io/). This
allows common published-source identity and reader controls, while acquisition,
structure validation, authorship and license metadata remain adapter-specific.
The Kerodon adapter does not execute downloaded HTML/scripts or fetch media.
Unsupported media has a warning and exact retained HTML; an unsupported page
structure fails rather than inventing a complete section. Live page comments
and navigation are excluded from mathematical passages; the original response
remains retained unchanged.

nLab has no implemented importer in this release. Inspect its format,
identifiers, revision mechanism and rights before adding an adapter. Do not infer
that a similar rendered page shares Gerby's source or acquisition contract.

These checks establish source identity, byte retention and navigation. They do
not establish mathematical correctness, complete dependencies or comprehension.
