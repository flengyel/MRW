# MRW notebook provenance profile 1

This bounded profile uses [PROV-O](https://www.w3.org/TR/prov-o/). It describes
retention and, when supplied, a producer's execution report. It does not check
mathematics or claim complete PROV-CONSTRAINTS conformance.

## Identity and accounts

A retention has a random UUID, independent of its filename, workspace and content
hash. Repeated retention creates distinct accounts. Each artifact has a SHA-256
revision and an account-local entity URI. Paths are locators, never identities.
The private record contains exact bytes; reopening requires neither Jupyter nor
the original files. An export ZIP contains a manifest, exact artifacts, a readable
transcript and one Turtle file per named bundle. Bundle identity and attribution
are in the manifest. Separate accounts are not silently merged.

The MRW account observes a capture activity. It `prov:used` the selected file
revisions; the retained notebook and selected companions `prov:wasGeneratedBy`
that capture and `prov:wasDerivedFrom` their exact originals, by byte copying.
The software agent is MRW, with the active extension version and matching clean
build marker when available; direct bridge calls without that identity say
unknown. A content hash establishes integrity, not authorship.
Capture time is not execution time. Original absolute paths are private locators
and are omitted from exports.

## Execution evidence

Ordinary saved outputs have unknown execution context: they may predate the
current code. Their cell association and execution counts are preserved, but MRW
does not assert that the current code generated them.

The optional `metadata.mrw_execution` receipt has schema `mrw-notebook-run:1`,
a run UUID, producer name, UTC start/end times, outcome (`completed` or `failed`),
code and output digests, and string-valued environment versions. Digests use
UTF-8 JSON with sorted keys, no extra whitespace, and non-ASCII characters kept.
Code is the ordered array of code-cell source strings; outputs are the ordered
array of their output arrays. Strings and arrays of source lines normalize to
the same string. The receipt covers this notebook's code and saved outputs only.
It makes no claim about unselected files, secrets, live kernel memory or earlier
interactive state. Stochastic/data-dependent work must record its seed and input
versions in the notebook and explicitly retain relevant files.

A matching receipt becomes a **producer-reported** bundle, separate from MRW's
observed capture. Its execution activity `prov:used` a code entity typed also as
`prov:Plan`; the output entity `prov:wasGeneratedBy` that activity. The activity
`prov:wasAssociatedWith` the named software producer. MRW neither authenticates
the report nor promotes it to an MRW-observed execution. Companion files are
associated selected material, not automatically asserted execution inputs.
No output-to-code derivation is inferred just from use and generation.

## Validation and deletion

Validation covers version/field types, unique IDs, bounds, exact artifact hashes,
notebook structure, receipt digest agreement, time ordering and outcome/error
agreement. Export constructs relation directions and references from these
validated records. It does not implement PROV inference, all temporal constraints,
reproduction, a proof checker, or a trust service. Unknown context stays unknown.

Records use the existing private atomic publication and mutable-file locks.
There is no additional event store or replay requirement. Existing usage history
records only action names and opaque retention IDs. Deletion first publishes an
opaque marker, then removes the selected record. A retry/restart completes an
interrupted deletion; the marker prevents reopening or reuse of the deleted ID.
Ordinary notebooks, companion notes, other results and separately exported copies
are outside its scope. Workspace relocation carries private records as it does
other workspace storage. No source file is rewritten.
