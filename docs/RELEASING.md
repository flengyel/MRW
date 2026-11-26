# Publish a GitHub release

MRW is distributed as a workspace-extension VSIX, with identity `flengyel.mrw`.
The current release is [0.23.66](https://github.com/flengyel/MRW/releases/tag/v0.23.66).
GitHub-distributed updates require downloading and installing a newer VSIX;
there is no automatic update channel or Marketplace publication in this procedure.

Publish normal releases by default (`prerelease: false`) and mark the newest
release as **Latest**. Reserve the prerelease flag for an explicitly designated
test candidate. MRW remains experimental; that description does not require the
GitHub prerelease flag.

To promote an existing prerelease, clear **Set as a pre-release**, select
**Set as the latest release**, and save. Keep its tag, version, assets and
checksums unchanged; changing release metadata requires no rebuild. Verify the
release page and the [latest-release link](https://github.com/flengyel/MRW/releases/latest).
The steps below apply when building a new version.

1. Fetch origin and reconcile main without discarding local work. Inspect remote
   tags and all releases, including drafts. Choose an unused patch version;
   never move a published tag or overwrite a published asset. Use an isolated
   worktree when needed and keep the working VS Code window and private data intact.
2. Update `vscode/package.json`, matching root metadata in
   `vscode/package-lock.json`, `pyproject.toml` and `src/mrw/__init__.py` to the
   same version. Preserve dependency pins. Set the `mrw` Activity
   Bar container title to `MRW <version>` in the manifest; VS Code uses it for
   the icon hover and sidebar heading. Package verification rejects a stale title.
   Update versioned release and VSIX links in both READMEs and the installation
   guide. Keep release facts and check results in release notes or the pull
   request. Commit these changes as **A**.
3. Set `vscode/media/build-info.json` to the selected version, A's full commit SHA
   and `localChanges: false`. Commit only that marker as **B**. Verify that the
   A-to-B diff contains only this file. B is the release commit; A is the embedded
   source marker. Build from clean B. Changes to source or the tutorial require
   rebuilding and repeating the applicable checks before choosing the final tag.
4. With Linux Node.js 22+, npm and Python 3.11+, run from the repository root:

   ```sh
   npm ci --prefix vscode --ignore-scripts
   node --test vscode/test/tutorial.test.js
   TZ=UTC SOURCE_DATE_EPOCH=1792094267 npm run package --prefix vscode
   core_version=$(node -p "require('./vscode/package.json').version")
   diagnostics_version=$(node -p "require('./diagnostics/package.json').version")
   npm run check --prefix diagnostics
   npm test --prefix diagnostics
   TZ=UTC SOURCE_DATE_EPOCH=1792094267 npm run package --prefix diagnostics
   python3 vscode/scripts/verify-vsix.py "vscode/mrw-$core_version.vsix" \
     --diagnostics "diagnostics/mrw-diagnostics-$diagnostics_version.vsix"
   ```

   Check changed documents and their links.
   Record dependency audit findings without silently changing pinned versions.
   Compare runtime files with the previously verified baseline; run relevant
   regressions for uncovered runtime changes. Changes to shared reader/plugin code require
   the full Python and extension suites, syntax checks, a clean wheel install,
   an extracted-VSIX bridge check and isolated interface checks. Verify no stale
   generated package is present. Check product names, icons and command labels in
   tracked files and both extracted VSIX packages. Check fresh workspace setup,
   reopening a differently named workspace, and following a registered move as
   described in the [workspace guide](WORKSPACE_SETUP.md). Keep one-time data conversion and original
   evidence outside maintained source and installation directories. Documentation-only shortcuts do not apply.
5. Inspect the final manifest, build marker, revised tutorial, guide links and
   packaged README. The verifier checks the exact inventory, runtime bytes and
   bundled licenses/notices; do not include vault files, private settings, logs
   or test evidence. Generate a checksum for each package.

   ```sh
   release_dir=$(mktemp -d)
   cp "vscode/mrw-$core_version.vsix" "diagnostics/mrw-diagnostics-$diagnostics_version.vsix" "$release_dir/"
   (cd "$release_dir" && sha256sum *.vsix > SHA256SUMS && sha256sum -c SHA256SUMS)
   ```

   Keep packages, checksums and build/check logs outside tracked source. Retain
   local logs and exit statuses; upload only the intended release assets.
6. Fetch again and preserve concurrent main commits with normal integration and
   pushes. Confirm B is included in main. Tag B with `v` followed by the new core version
   and push that tag. Create a **draft release** for it with `prerelease: false`. Attach both VSIX files and
   their `SHA256SUMS` from the release directory.
7. Release notes identify B and A, actual changes, requirements, installation,
   optional companions, known limits and manual update instructions. Link the
   [installation guide](INSTALLATION.md), [reading guide](READING_OUTLINE_WORKFLOW.md)
   and [TikZ setup](TIKZ_WORKFLOW.md). Publish only the completed draft and mark
   it as **Latest**. Verify its public page, `prerelease: false`, latest-release
   link, tag target and README link. Download both VSIX files and `SHA256SUMS` through their
   versioned URLs. Compare the manifest with the locally generated copy, then
   verify both packages with `sha256sum -c SHA256SUMS`. Record the URLs, commits, checksum
   and actual checks in the release notes or linked pull request. Publication failure remains pending,
   not a completed release; preserve the ready assets and release-note text.

See [GitHub's release instructions](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).
This procedure does not install or reload the extension in the working window.
