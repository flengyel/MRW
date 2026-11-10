# Complete MRW identity

The Python package, distribution and CLI are `mrw`. The Lean namespace is `MRW`.
The workspace extension remains `flengyel.mrw`. The bridge imports the bundled
`mrw` package under Python isolated mode; no checkout or editable installation
supplies production imports. Generated core directories are rebuilt from source.

The application writes and reads MRW schemas only. Saved-work conversion is a
one-time external operation; its tool, originals, journals and backups are outside
the maintained project and installation directories. It is not a compatibility
reader, alias or forwarding module in MRW. Original mathematical source bytes and
annotations are preserved. Existing MRW source IDs and citation scope hashes are
retained in the converted store, whose format version is 2.

Superseded verification reports and evidence were archived unchanged outside the
maintained project. Their historical source snapshots remain available through
Git history. Current links identify those snapshots instead of presenting edited
evidence as original observations.

Release verification covers the full Python and extension suites, pinned Lean
build/tests and regenerated bundles, clean Python wheel entry points, the extracted
VSIX bridge, isolated host interaction, migrated saved work, and zero superseded
identity occurrences in tracked paths/text and the extracted package. The release
notes record the actual results, source commits and remaining validation limits.

## Verification for 0.23.8

The persistent-checkout Python run passed 417 tests, with the Windows-mounted
project case skipped because no authorized disposable Windows project parent
was configured. Qt widget and isolated TikZ checks were enabled. Three focused
entry-point, staging and store-identity checks also passed. The pinned Lean
build completed all 30 jobs and `lake test` passed; regenerated bundle pins
refer to the MRW checker. These checks validate the checker and graph mechanics,
not arbitrary mathematical claims in reader notes or proposed outlines.

The one-time local conversion validated three saved sources, two inline reader
annotations and the retained diagram index. All eight distinct document citations
resolve to exact retained revisions. Two previously unavailable citations were
recovered from a preserved generation of the same identified store. Original
source bytes, annotation text, project/store IDs and MRW citation scopes were
preserved. Of the 193 current extension-home files, only the active-store binding
and one preparation ticket changed; other records and drafts retained their bytes.
Three standalone sessions and their buffer identities were also converted and
validated. Original records, conversion tools and journals remain in the external
migration archive; none are shipped as runtime compatibility code.

The candidate tracked-tree audit searched every tracked path and file and found
zero superseded identity matches. Final clean-build package checks and the
extension-suite outcome are recorded in the release notes, with the source marker,
release commit and download checksum. The working VS Code window is not reloaded
or used as the acceptance-test window.
