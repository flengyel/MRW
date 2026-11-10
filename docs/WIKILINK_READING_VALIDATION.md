# WikiLinks and reading — 0.22.3

Implementation: `efc0d61a0d3ffea2d2fa8541a9f33ffa92d68543`.

`[[ID]]` and `[[ID|label]]` are links in Markdown source and preview. Editor
links use VS Code’s link modifier; preview links use an ordinary click. Both
recheck the exact original occurrence before entering the scoped resolver.
Aliases supply display text, not source authority. Code, comments, metadata and
embeds do not become navigation actions. Repeated links keep distinct return
locations. Missing/ambiguous targets, stale occurrences and unsupported
selectors are reported without guessing. Qualified published IDs keep their
prefix; retained citations remain a separate revision/passage contract.

**MRW: Notes Folder** is a user-configurable setting. **Choose Notes Folder…**
updates it for the workspace; direct settings changes take effect on the next
navigation. It accepts an absolute extension-host path, including `/mnt/c/…`
under WSL. The supplied vault is configured in the working study workspace,
not embedded in production code or committed settings. Activation and link
highlighting do not scan the folder.

Markdown opens in preview. **Edit Document Source** provides explicit editing.
Backlinks from preview use that document instead of an unrelated active text
editor. **Show Contents** is the first action in Studies and is also on its title
toolbar, providing a route back to reading controls without starting a study.
No import, source copying or study question is needed for ordinary reading.
The bundled tutorial and current document workflow describe these actions.

## Checks and observation

- Focused document/parser/resolver/study-preservation/tutorial checks: **63/63**
  on the integrated working sources and **63/63** in an isolated snapshot of
  the committed source. The latter stages the established Python bundle first.
- Focused extension activation, Contents, Return, group/draft preservation and
  ordinary/retained navigation checks: **11/11** on the integrated working
  sources. JavaScript syntax and `git diff --check` pass.
- An isolated native **VS Code 1.144.1 / WSL** host, staged from the verified
  package, passes **7/7** checks: configured folder without picker, editor link
  discovery, built-in Markdown rendering, editor follow into native preview,
  Return into original preview, preview-link dispatch through the registered
  URI handler, and Edit Document Source. The wrapper changes only the test
  entry point and uses disposable notes. This observes the real editor API and
  renderer; it does **not** claim an observed pointer click or sidebar capture.
- The supplied note remains byte-identical. The actual vault was not rescanned
  for these UI checks. No genuine annotations, studies or history were fixtures.
  The working window was not reloaded or rearranged; the isolated test window
  closed itself after its checks.

## Package and delivery

`vscode/mrw-0.22.3.vsix`: **556,926 bytes**, **98 archive entries**.
SHA-256: `d20e80b3e29827a491cf6ca1c63dc72a32f43e2e380788bcf30a598a77a82e28`.
The established verifier matches the manifest and runtime bytes against the
checkout, checks pinned assets and excludes development files. All **96**
installed package files match the archive, allowing only installer manifest
metadata. Installation completed through the existing WSL extension-host CLI.
Command/view IDs and dependency pins are preserved; two commands are added.

The package deliberately retains the separate reader-orientation work already
present in the checkout; its build marker records `localChanges: true`. That
work remains pending separately, including its stronger visible-editor fixture.
The new patch's focused committed-source checks are reported separately from
checks of the combined installed sources. The working window adopts the new
runtime and guide on its next normal reload; no forced reload was performed.

Manual cursor placement plus Follow Document Link, or searching Contents for a
WikiLink, is replaced by clicking the link. The chosen folder is editable in
Settings and reused after restart. Reading no longer requires opening source
text first, and Studies has a direct route back to Contents. Wiki paths,
heading/block selectors and embeds remain unsupported; backlink results can
remain incomplete when links elsewhere in the vault cannot be resolved. This
patch does not extend those resolver capabilities or claim mathematical checking.

[Machine-readable evidence](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/wikilink-reading-20261107.json).
