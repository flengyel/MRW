# Retained notebook results

Notebook creation, editing and execution belong to Jupyter and the selected
native editor; [the integration contract](INTEGRATION_BOUNDARIES.md) governs
MRW's capture and reference role. A retained result is a separate snapshot, not
the live notebook or kernel. Synchronizing its files does not restore execution
state or authorize rerunning cells.

Run and save a notebook using its normal Jupyter editor and kernel. **MRW:
Retain Notebook Result…** saves a separate exact copy in this workspace's private
storage. The notebook toolbar exposes the same action. You may include a working
note, input data or method file. Nothing is imported into your notes folder.
Dirty selected documents must be saved first; MRW does not save them for you.

**MRW: Open Retained Notebook Result…** lists captures by title, date and evidence.
It opens a read-only transcript and offers:

- Compare with another retained result, in VS Code's diff view.
- Read a retained companion file.
- Copy a link for an ordinary note.
- Export provenance and exact files.
- Delete this retained copy after showing its scope.

Escape closes the action picker and leaves the transcript open. Reopening,
comparison and export do not start a kernel. **MRW: Open Link from Clipboard**
follows a copied result link in its owning workspace. Paste that URI into an
ordinary Markdown link to keep it beside the argument. Preview, Contents and
source-editor links open that saved result directly, without another action
picker. **Return to Document** selects the exact originating link, including
repeated occurrences; the pin survives restart. Wrong-workspace, deleted or
stale links preserve the previous Return destination and unsaved work.
Workspace relocation
carries the results and rebases links through the existing move record.

**MRW: Export Notebook Provenance…** selects several captures for one ZIP. The
archive contains exact notebooks and companions, readable transcripts, an
artifact/checksum manifest, and separate Turtle files for the named provenance
accounts. It includes the selected files' saved metadata and content; choose
what to share accordingly. Original absolute paths are not added to the export.
A destination must be a new ZIP file; MRW refuses to overwrite one.

## What a result establishes

A saved notebook preserves code and outputs. It does not establish that the
current code produced those outputs, or restore live kernel memory. Such captures
say **execution context unknown**. A matching producer receipt adds a separately
attributed execution account; it does not become an independently verified run.
Structure and integrity checks do not check the mathematics.

The [quadratic discriminant examples](../examples/notebook-provenance/README.md)
include two Sage methods, a failed construction, an ordinary working note and an
optional explicit execution helper. The helper starts a fresh kernel and records
its report; it is not called by MRW. See the [profile](NOTEBOOK_PROVENANCE_PROFILE.md)
for the exact receipt and export format.

## Required display and comparison follow-up

Current capture/export is delivered; the complete comparison route remains
partial. Expose retained-result actions with notebook opening/setup, and keep
links to input/method revisions and relevant source notes or proof work visible.
Evaluate the native notebook view/diff first and
[nbdime](https://nbdime.readthedocs.io/en/stable/cli.html) as a notebook-aware
alternative before implementing a custom comparison engine. Adoption is not
decided by naming the library; verify host compatibility, resource use and
safe rendering of retained output. Preserve the present transcript fallback.

Comparison distinguishes cell source, outputs, metadata and execution receipts;
a changed image/error must not disappear into raw JSON. Opening a retained
notebook does not grant trust to execute cells, widgets or arbitrary output
scripts. Keep exact retained bytes immutable; writable copies are separate.
No automatic merge, kernel start or replay follows from comparison/export.

Accept the route with two retained results, including text/error and plot output,
follow their source/method and note/proof links, compare them, export the selected
records, and return after restart. Record unavailable renderers or unsupported
output rather than inventing equivalence. See [D12](DESIGN_RECONCILIATION.md).

## Limits and preservation

Retain at most one 16 MiB notebook and sixteen companion files, each at most
16 MiB and together at most 32 MiB. Exports accept up to eight captures and
64 MiB of original material. Rich outputs remain in the exact notebook; the
MRW transcript renders plain text and errors, not HTML, plots or widgets. Binary
companions are available through export. MRW does not record arbitrary kernel
state, authenticate producers or automatically collect external dependencies.

Deletion removes the chosen private snapshot, including its copied companions.
It preserves ordinary files, other captures and separately exported archives.
An opaque marker prevents deleted IDs from reappearing. A restart completes a
pending deletion. Already open read-only views can retain their displayed text
until closed. Study deletion does not own these explicitly retained results.

## Native retained-result viewing

With Jupyter installed, retained notebooks open through the native notebook
editor on a read-only mrw-notebook-result filesystem. Exact retained bytes and
digests are checked. Comparison uses native notebook diff with saved rich
outputs; without Jupyter the transcript remains available. Capture/execution
evidence is a separate action. Reading and comparison submit no execution or
merge and restore no live kernel.

[nbdime](https://nbdime.readthedocs.io/en/latest/cli.html) was evaluated: web
comparison adds a server/browser and its CLI supplies text. Native notebook diff
is the smaller reuse route for this host. Source/method revisions and companion
files remain in the existing provenance export.
