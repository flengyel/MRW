# Codex task: publish the first MRW GitHub prerelease

Prepare, verify and publish a GitHub prerelease of MRW with an installable VSIX.
This task includes the release-preparation commits, push to main, version tag,
asset upload and publication. It does not include Marketplace submission, new
features, repository visibility changes or installation into the working window.

## Starting point

Reviewed main: `e3b0368c0281228bdc18c46bcc92e7911ee5f802`.
The repository is public. No GitHub releases were present when this prompt was
prepared. The package version is 0.23.5; the editorial commit follows that
version's verified package and changes the bundled tutorial.

Fetch current main and inspect the local worktree, remote tags and releases.
Read AGENTS.md, the current sections of CODEX_PLAN.md and
docs/CODEX_CONTINUATION.md, docs/READING_REPAIRS.md, and the packaging
instructions in vscode/README.md.
Preserve later commits and all uncommitted work. Use an isolated release
worktree if needed; never reset the working checkout.

Target **0.23.6**, tag **v0.23.6**. If that version has already been published,
inspect it first: report completion if it fulfils this task, otherwise use the
next unused patch version. Do not overwrite a release asset or move a published
tag. Substitute the selected version consistently below.

## Prepare the release

1. Keep the extension identity `flengyel.mrw`. Update the version in
   vscode/package.json and the matching package-lock.json metadata, preserving
   pinned dependency versions. Do not update dependencies as release preparation.
2. Update current package examples in README.md, vscode/README.md and
   docs/INSTALLATION.md. Keep dated reports and their versions unchanged.
   Include the revised tutorial and the editorial changes already on main.
3. Add a prominent versioned download link to the README:
   `https://github.com/flengyel/MRW/releases/download/v0.23.6/mrw-0.23.6.vsix`,
   with the matching release-page link. Use explicit versioned links rather
   than relying on GitHub's latest-release redirect for a prerelease.
4. Add a current-status note to PUBLIC_READINESS.md: the repository is public,
   and this task distributes the packaged extension. Preserve the November 5
   review's scope, findings and unresolved decisions; public visibility does
   not retrospectively clear those findings. Do not rewrite history or remove
   research material as part of this task.
5. Add a short docs/RELEASING.md describing this repeatable procedure. Keep
   VSIX files and build logs outside tracked source; upload the package as a
   release asset. No new automatic publishing workflow is needed.

## Record the build honestly

Packaging currently leaves vscode/media/build-info.json unchanged. Do not ship
a 0.23.6 package carrying the old 0.23.5 build marker.

Use the following sequence, or an equivalent existing procedure with the same
source correspondence:

- Commit version, documentation and release-preparation changes as commit A.
- Set build-info.json to the selected version, commit A's full SHA and
  `localChanges: false`. Commit only that marker change as commit B.
- Verify A to B changes only the marker. Build from clean B. Tag B after
  verification. The release notes identify B as the release commit and A as
  the embedded source marker.

This distinguishes source identity from packaging metadata without trying to
put a commit's own SHA inside that same commit. If source or tutorial files
change after verification, prepare and verify the resulting package again
before selecting the final tag. Use normal pushes; preserve concurrent main
updates and ensure the final release commit is included in main.

## Build and verify

Use the Linux/WSL tools already used by this project. From the repository root:

```sh
npm ci --prefix vscode --ignore-scripts
node --test vscode/test/tutorial.test.js
TZ=UTC SOURCE_DATE_EPOCH=1792094267 npm run package --prefix vscode
npm run verify-vsix --prefix vscode -- mrw-0.23.6.vsix
```

Inspect the final package manifest, build marker, bundled tutorial and README.
Confirm the package has the selected version, the revised guide, working guide
links and the expected workspace-extension identity. Preserve bundled licenses
and notices. Use the verifier's expected inventory to ensure the release
contains no added vault files, private settings, logs or test evidence.

The checksum file must name the asset without a machine-specific path:

```sh
cd vscode
sha256sum mrw-0.23.6.vsix > SHA256SUMS
sha256sum -c SHA256SUMS
```

For a documentation/version-only change, tutorial tests, document checks and
package verification are sufficient. Compare runtime files with the verified
0.23.5 baseline; run relevant regressions if intervening runtime changes lack
coverage. Do not repeat a full runtime or native-host campaign solely to publish
the documentation update. Do not reload the working VS Code window, close
Obsidian, move notes or create a new study session.

## Publish and check the download

Use git for commits and tags, and an available authenticated GitHub API or
browser route for the release. Do not require a switch to gh, expose credentials,
or commit local authentication configuration.

Create a draft titled **MRW 0.23.6 — first public prerelease**, targeting the
verified tag, with GitHub's **prerelease** flag set. The extension's numeric
version remains 0.23.6. Attach:

- `mrw-0.23.6.vsix`
- `SHA256SUMS`

Release notes should explain:

- This is the first downloadable GitHub prerelease, incorporating the reading,
  WikiLink, mathematical-macro and TikZ capabilities delivered in 0.23.5.
- Changes since the 0.23.5 package: revised documentation/tutorial and release
  packaging, plus only changes actually present in the selected source.
- Installation: in VS Code connected to the intended Linux/WSL/SSH workspace,
  run **Extensions: Install from VSIX…** and choose the downloaded package.
  Requirements are VS Code 1.95+ and Python 3.11+ on the workspace host.
- Obsidian, SageMath/Jupyter, Lean and AI tools are optional companions; TikZ
  compilation has the separate tools described in docs/TIKZ_WORKFLOW.md.
- Main limits include PDF-page and preview-scroll restoration, Obsidian embeds
  and arbitrary LaTeX preambles/packages. Link the relevant guides.
- GitHub-distributed updates require downloading and installing a newer VSIX.

Finish the draft and attach both assets before publishing it. Then download
the published assets through their versioned URLs and check the VSIX against
SHA256SUMS and the verified local bytes. Confirm the public release page,
prerelease flag, tag target and README download link.

If publication access is unavailable, complete all local preparation and checks,
retain the ready assets and release-note text, and report the exact remaining
upload/publish step. Keep status wording accurate if publication remains pending;
do not report an unpublished draft as a completed release.

## Completion report

Return the release URL, direct VSIX link, version/tag, release and source-marker
commits, checksum and concise check results. State any remaining limitation.
Do not reproduce private logs or claim installation into the working window.

GitHub release reference:
https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository
