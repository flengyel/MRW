# MRW 0.23.32 — citations and research routes

Published and publicly verified: [release](https://github.com/flengyel/MRW/releases/tag/v0.23.32).

MRW 0.23.32 adds offline bracketed Pandoc/CSL citations in the native Markdown preview and reader annotations; independent many-to-many source-note/Zettel associations; grouped native tool menus and companion setup; selected-resource Lean actions; and native read-only retained notebook viewing/comparison through Jupyter. API actions identify OpenAI, and an exact retained-passage copy route supports Codex without sending.

The separate optional `mrw-diagnostics-0.1.0.vsix` supplies bounded read-only feature-use/integrity reports, period comparisons, export and a reviewable Codex handoff. Weekly reporting is opt-in and missed runs coalesce while VS Code is active. Core remains usable without the companion. Inspection does not repair/delete research, synchronize history, execute cells/checks or call a model. Install the core first and the optional companion separately on the same workspace host.

Zettelkasten creation still belongs to the configured editor/template. Linked notes may paraphrase or combine sources while source annotations remain editable. Existing snapshots, transfer records, attribution, references and external originals are preserved.

Requirements: Linux/WSL/SSH workspace host, Python 3.11+; trusted local Pandoc for citation rendering; optional Jupyter for rich notebooks and Lean for Lean work. Windows Pandoc in WSL needs its explicit /mnt/c/... executable setting. Bibliographies/styles are scoped local inputs; no Zotero query, remote-style fetch or arbitrary filter runs on opening. A missing key remains unresolved. The maintainer's Marcus key was absent from the existing local export; this release does not fabricate it. Standalone narrative @key and remote/dependent styles remain unsupported.

Verification: Python 457 run, 389 passed and 68 skipped. The broad extension run passed 561/563; two obsolete menu assertions were repaired and both focused regressions passed, followed by 56 affected checks and additional focused review regressions. No all-green rerun of the complete extension suite is claimed. Native Windows VS Code 1.146.0/WSL checks observed activation, Contents, Markdown citation/bibliography rendering, dirty-buffer preservation and diagnostics activation. Full live Zotero/lesson round trips and rich-output visual acceptance remain unobserved. The pinned Lean 4.32.2 contract pilot and three concrete relocation/recovery traces passed; this proves the abstract model and sampled conformance, not implementation refinement or liveness.

Final clean-package checks: exact VSIX inventory/runtime bytes, clean wheel import/CLI, extracted core import/CLI/bridge and superseded-identity scans passed. Both final assets are covered by SHA256SUMS. Dependency pins are unchanged; npm audit retains 3 high and 2 moderate findings. Wider continuity, shared/continuous availability measurement, full diagnostics schemas/anchors/external targets and later formal models remain partial/pending in the complete D01–D22 register.

Source A: `ed10aa97f194cb8e3a184d66cdaf7bef61d4db43`. Build/tag B: `90023ba8027ebf422c306aa08b0fbe83d46949d8`. B changes only the build marker from A; marker localChanges is false. Concurrent architecture and justification-engine documentation were preserved. No working-window installation or reload was performed. The installed WSL registry was 0.23.31 at task start. GitHub VSIX updates are manual; no Marketplace publication.

[Installation](https://github.com/flengyel/MRW/blob/v0.23.32/docs/INSTALLATION.md) · [Changes and evidence](https://github.com/flengyel/MRW/blob/v0.23.32/docs/MAINTENANCE_20261114.md) · [Complete design register](https://github.com/flengyel/MRW/blob/v0.23.32/docs/DESIGN_RECONCILIATION.md) · [Diagnostics](https://github.com/flengyel/MRW/blob/v0.23.32/diagnostics/README.md) · [Reading](https://github.com/flengyel/MRW/blob/v0.23.32/docs/READING_OUTLINE_WORKFLOW.md) · [TikZ](https://github.com/flengyel/MRW/blob/v0.23.32/docs/TIKZ_WORKFLOW.md)

## Final archive and preservation checks

All 577 tracked files and paths, 161 core archive entries and 7 companion
entries were scanned for superseded project identities: zero occurrences.
Exact inventory/runtime-byte checks, packaged README/help/manifests/marker,
extracted isolated Python import/CLI/bridge and command guards passed. A clean
wheel build/install/import/CLI passed in a fresh venv. The first attempt used
system Python without pip; that failure was retained in the logs.

Both published VSIX assets and SHA256SUMS were downloaded through public
versioned URLs and matched local bytes. sha256sum -c passed for both packages.
The public Latest URL redirects to 0.23.32. Anonymous API metadata inspection hit
its rate limit; authenticated publication metadata and public page/downloads
established the final result.

A late concurrent documentation merge conflicted in the register. Resolution
preserved both the justification-engine architecture and implementation statuses.
An intermediate unmerged build failed the clean-source gate and was not tagged
or published. Its logs remain outside source; the subsequent clean verified B
alone supplies the release. Build preparation now checks clean source first.

The independent contract build and proof audit used pinned Lean 4.32.2; no new
axioms or admitted proofs. Theorems use propext and, for generic nontrivial
relocation, Quot.sound; the unlink theorem uses none. Three real relocation/
recovery traces agree with the executable model. This is specification proof
and sampled conformance, not implementation refinement or a liveness proof.

Native observations used isolated development hosts before final source-marker
stamping. They are not installed-package visual acceptance of all routes. The
working WSL registry still lists 0.23.31; Diagnostics is not installed. No
working-window installation/reload occurred. The selected Number Fields note
and NewFileTemplate retained their before-task hashes; no live authoring prompts,
kernels, queues or genuine research records were used for mutation tests.

The final focused proof-graph/tutorial pass had 20 successes. Later bounded
citation, annotation and inspection regressions passed as well. Full Python was
457 tests, 389 successes and 68 skips. The broad extension run and repaired
focused results above are distinct; no all-green full rerun is claimed.

## Detailed evidence and remaining work

The [maintenance account](MAINTENANCE_20261114.md),
[complete D01–D22 register](DESIGN_RECONCILIATION.md),
[contract mapping](CONTRACT_PILOT.md) and
[Diagnostics guide](../diagnostics/README.md) preserve observations, design
comparison, corrections and remaining limits. Local logs and exit statuses are
under the repair evidence directory outside tracked source. The full native
lesson/Zotero/rich-output routes, wider reconstruction, continuous/shared
availability measurement, fuller diagnostics schemas/anchors/external targets
and subsequent operation/report models remain partial or pending.

## Package checksums

```text
79e8222674822867b6c58c360e167f457e2db7d8c2d5f7e4f35fc792a9df3fdd  mrw-0.23.32.vsix
4b4c5a3844273a24f635edea2de232bc2460c7599b91ca28f287d31f713d91f6  mrw-diagnostics-0.1.0.vsix
```
