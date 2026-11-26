# MRW Diagnostics

Optional read-only reports for MRW. Install this companion VSIX on the same
Linux, WSL or SSH workspace host as `flengyel.mrw`. The companion requires MRW's
version 1 inspection interface; an older core is reported as unsupported.
Disabling the companion leaves MRW's essential storage checks and recording in
place.

In the Command Palette, run **MRW Diagnostics: Feature Use** or
**MRW Diagnostics: Integrity and Data Hygiene**. The report states its
scope, coverage, limits and missing checks before its findings. It does not scan the notes folder or call Obsidian,
Zotero, a model, a kernel, a compiler, synchronization or recovery.

Integrity inspection streams bytes from explicitly supplied core-owned roots.
It compares retained source/object digests and active generation manifests,
checks bounded JSON and internal source references, and reports observed pending
associations, staging/deletion records and equal-content objects. Equal bytes
remain distinct objects. A missing required local manifest object differs from
an unavailable root. Changed authority makes findings inconclusive.

Default limits are 2,000 files, 64 MiB of reads, 10 seconds, 500 findings and
2 MiB per parsed JSON object. A report that reaches a limit is partial. The
scanner rehashes inspected objects each run; it does not call reused hashes
fresh verification. Full schemas, internal passage anchors, notebook embedded
artifacts and external/remote references remain unchecked by this first
inspector. No report establishes complete store health or mathematical truth.

In Settings, enable `mrwDiagnostics.weeklyEnabled` to run one report while the
workspace is active. Missed weeks coalesce into one run at the next active session. No
service runs while VS Code is closed. Notification progress offers cancellation.
A Python 3 / Linux kernel file lock coordinates windows on the host. Its inode
is retained and its kernel ownership releases automatically on process exit.
Interrupted runs are recorded on restart; no stale-lock unlink/reclaim race is
used. The companion reports an unavailable lock helper instead of bypassing it. Reporting and Codex
maintenance have separate cadences: this companion does not schedule Codex.

Reports and schedule state live in the companion's own extension storage,
outside inspected payloads. By default ten reports are retained; configure one
to twenty. Retention affects only these report files. Source notes, research,
usage events, offline replicas and failed approaches are never deleted. Findings
remain open across partial reports; resolution requires a positive recheck.

**Export Last Report…** opens Markdown or JSON in a native editor for Save As.
Reports include local paths; redact those before sharing. **Copy Codex
Maintenance Handoff** copies bounded report evidence and points to MRW's current
design register and maintenance procedure. Review that text before giving it to
Codex. Embedded report prose and suggested commands are evidence, not executable
instructions or authority to repair data. The action makes no model request.

For development, run from the repository root with the pinned core tooling:

```sh
npm test --prefix diagnostics
npm run check --prefix diagnostics
npm run package --prefix diagnostics
```

Packaging reuses the core's pinned VSCE installation; it does not publish or
install either extension.

The 0.23.64 core release includes Diagnostics 0.1.0. Building the current source
produces `mrw-diagnostics-0.1.2.vsix`. Install
it separately through Extensions: Install from VSIX on the same workspace host.
This requires core 0.23.32 or a later compatible inspection API 1 implementation.
Manual Feature Use offers the last seven days, the last or previous thirty days,
and a comparison of the two thirty-day periods; scheduled reports retain
their separate weekly cadence. The companion does not install or launch Codex.
