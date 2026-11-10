# Publish a GitHub prerelease

MRW is distributed as a workspace-extension VSIX, with identity `flengyel.mrw`.
The current prerelease is [0.23.8](https://github.com/flengyel/MRW/releases/tag/v0.23.8).
GitHub-distributed updates require downloading and installing a newer VSIX;
there is no automatic update channel or Marketplace publication in this procedure.

1. Fetch origin and reconcile main without discarding local work. Inspect remote
   tags and all releases, including drafts. Choose an unused patch version;
   never move a published tag or overwrite a published asset. Use an isolated
   worktree when needed and keep the working VS Code window and private data intact.
2. Update `vscode/package.json` and matching root metadata in
   `vscode/package-lock.json`, preserving dependency pins. Update current examples
   in both READMEs and the installation guide, plus explicit versioned release
   and VSIX links. Preserve historical evidence unchanged; if a task requires its
   archival, link its immutable source snapshot. Commit these changes
   as **A**.
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
   npm run verify-vsix --prefix vscode -- mrw-0.23.8.vsix
   ```

   Substitute the selected version. Check changed documents and their links.
   Record dependency audit findings without silently changing pinned versions.
   Compare runtime files with the previously verified baseline; run relevant
   regressions for uncovered runtime changes. The 0.23.8 full rename requires
   the full Python and extension suites, syntax checks, a clean wheel install,
   an extracted-VSIX bridge check and isolated interface checks. Verify no stale
   generated package is present. Search every tracked path and text file, then
   the extracted VSIX, for superseded identities: zero occurrences are required.
   Keep one-time data conversion and original evidence outside maintained source
   and installation directories. No compatibility-reader or evidence exception
   substitutes for completion. Documentation-only shortcuts do not apply.
5. Inspect the final manifest, build marker, revised tutorial, guide links and
   packaged README. The verifier checks the exact inventory, runtime bytes and
   bundled licenses/notices; do not include vault files, private settings, logs
   or test evidence. Produce and check the checksum with a portable asset name:

   ```sh
   cd vscode
   sha256sum mrw-0.23.8.vsix > SHA256SUMS
   sha256sum -c SHA256SUMS
   ```

   Keep packages, checksums and build/check logs outside tracked source. Retain
   local logs and exit statuses; upload only the intended release assets.
6. Fetch again and preserve concurrent main commits with normal integration and
   pushes. Confirm B is included in main. Create and push tag `v0.23.8` at verified
   B. Use an authenticated GitHub API or browser to create a **draft prerelease**,
   titled **MRW 0.23.8 — complete MRW rename** for this release.
   Attach `mrw-0.23.8.vsix` and `SHA256SUMS` before publishing. Do not expose or
   commit credentials. No automatic publishing workflow is needed.
7. Release notes identify B and A, actual changes, requirements, installation,
   optional companions, known limits and manual update instructions. Link the
   [installation guide](INSTALLATION.md), [reading guide](READING_OUTLINE_WORKFLOW.md)
   and [TikZ setup](TIKZ_WORKFLOW.md). Publish only the completed draft. Verify
   its public page, prerelease flag, tag target and README link. Download both
   assets through their versioned URLs; check the downloaded VSIX against
   `SHA256SUMS` and the verified local bytes. Record the URLs, commits, checksum
   and actual checks in the delivery report. Publication failure remains pending,
   not a completed release; preserve the ready assets and release-note text.

See [GitHub's release instructions](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).
This procedure does not install or reload the extension in the working window.
