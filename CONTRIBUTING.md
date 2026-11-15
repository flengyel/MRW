# Contributing to MRW

MRW is an experimental VS Code extension for mathematical study and research.
Contributions are welcome, especially changes that make mathematical work
easier to read, navigate, check and resume.

## Useful contributions

Reproducible bug reports, focused fixes, clearer commands, accessibility
improvements, documentation corrections and examples of mathematical workflows
are useful starting points.

Small fixes can be submitted directly as pull requests. For substantial changes,
open an issue first describing the mathematical task, the present difficulty and
the proposed interaction. This applies particularly to new work modes,
integrations, storage formats, automatic actions and changes to command
behavior. A short concrete example is more useful than a large feature list.

Alternative ways of organizing work are welcome proposals. They should reuse
notes, sources and records where practical. Work modes are a design
possibility, not an established extension API.

## Reporting a problem

Include the MRW version, VS Code version and host arrangement, such as Windows
with WSL2. Describe what was expected, what happened and the shortest known
reproduction. Attach only relevant logs or screenshots and use minimal example
documents that can be shared publicly. Keep credentials and private research
out of reports and test fixtures.

For native Obsidian creation checks, use an isolated test vault and its
configured creation template. Do not create fixture notes directly in a user's
vault or fill and submit prompts in their working Obsidian window. A unit test's
synthetic Markdown files do not establish that the template ran. Preserve the
user's notes, templates, settings and open drafts.

## Preparing a pull request

Work on a branch from current main and keep each pull request focused. The
description should explain the problem, resulting behavior, checks performed
and any remaining limits. Link a related issue when one exists.

Use the [development guide](vscode/README.md#run-from-this-checkout) for setup
and the repository's current checks. Run the checks appropriate to the change.
Add a focused regression test when fixing behavior that can usefully be tested.
Documentation-only changes need their examples and links checked, not an
unrelated full test run. For interface changes, describe the host and visible
behavior observed; distinguish this from controller or rendering tests.

Update affected workflow instructions and the bundled tutorial when commands or
user interactions change. A pull request does not need a release package unless
packaging is part of the change.

Current decisions and unresolved work are recorded in the
[design reconciliation register](docs/DESIGN_RECONCILIATION.md). For maintenance
driven by usage or integrity reports, include the finding, applicable design
requirement, diagnosis and validation from the
[maintenance contract](docs/CODEX_MAINTENANCE.md). A report recommendation alone
does not justify changing product scope or removing retained data.

## Design expectations

Declare [feature-use coverage](docs/OPERATIONAL_USAGE.md) when adding or changing
an interaction. Map its entry points to a stable feature ID, distinguish child
operations and exclude test activity from ordinary-use reports. Missing
observations must not become zero use. Keep recording lightweight and reporting
bounded; low counts alone do not justify removal.

The optional [diagnostics plugin](docs/DIAGNOSTICS_PLUGIN.md) owns periodic
integrity/hygiene reporting, while core keeps required storage checks. Inspection
must not mutate inspected data or silently repair findings. Source plugin API 1
does not authorize maintenance operations.

Follow [the integration contract](docs/INTEGRATION_BOUNDARIES.md) when connecting
another subsystem. State its owner, supported creation/execution route, external
identities, synchronization behavior and evidence limits. Do not bypass the
maintaining system through a plugin. Native mutation tests may inspect identity
read-only, then must verify isolated vaults, kernels, runtimes or queues before
changing focus, dispatching work or writing data.

Preserve ordinary notes, unsaved work, Return destinations and the user's chosen
editor layout. Keep source revisions and attribution distinct from editable
explanations and corrections. Propose incompatible record changes explicitly.

Follow [Microsoft's VS Code UX guidance](https://code.visualstudio.com/api/ux-guidelines/overview).
Prefer native controls and contextual actions. Basic reading and work
must remain usable without Obsidian, an AI account, Lean or SageMath.

Keep mathematical claims precise. Source preservation, software tests,
calculations, formal proof checking and reader assessments establish different
things. A display or navigation change must not silently assign mathematical
correctness or comprehension.

For larger proposals, consult the
[research-workstation design](docs/RESEARCH_WORKSTATION_DESIGN.md). Discussion
can also identify a needed change to that design.

## AI-assisted contributions

AI-assisted contributions are welcome. Review and understand the submitted
change, check its references and report how it was validated. The same review
standards apply to all contributions. Preserve attribution for mathematical
text, examples and retained model responses.

## Review and licensing

Pull requests are assessed for usefulness, maintainability and fit with the
project. The maintainer may request revisions, defer a change or decline it.
Opening a discussion or submitting a pull request does not guarantee a merge
or a particular review date.

The project uses the [Apache-2.0 license](LICENSE). Preserve notices
and include source, license and attribution information for third-party
material added by a contribution.

## Native tests

Use the [owned-fixture procedure](docs/NATIVE_TEST_ISOLATION.md). The shared
guard must pass before a native test activates MRW, patches a host API or writes
test data. A new window, a familiar fixture filename or a supplied directory
does not prove isolation. Never use genuine notes, saved stores or working
profiles as mutation-test fixtures.
