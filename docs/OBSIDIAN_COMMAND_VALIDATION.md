# Obsidian to MRW command — 0.22.5

Delivered on 2026-11-07. MRW source: `61f12049d0cc87b4e243c53860323be33447720e`. Companion template and guide:
[flengyel/Zettel](https://github.com/flengyel/Zettel/commit/7b33e537663b802ae439cf92ee8077d48877417a).

In Obsidian, **Templater: Open in MRW**, bound to **Alt+/** in the configured
vault, opens the current note in MRW's Markdown preview and Contents. The
startup template only registers the action; it opens nothing automatically.
The user explicitly authorized enabling that single reviewed startup template.
It uses the current filename when invoked, works without an editor, and neither
inserts text nor processes selections. The earlier Insert entry was removed.
The three existing templates and all original shortcuts remain configured.

The vault-local MRW configuration records its workspace and notes-root route.
Those private paths were not committed to Zettel. Normal MRW links are strict,
restart-stable current-file locators. They neither grant a vault nor replace
immutable retained source/passages. Wrong-workspace recovery opens a separate
window only after its explicit action; it leaves the working window open.

## Verification

- All **319** extension regression checks passed on disposable ext4 storage,
  exit 0. The initial memory-backed `/tmp` run correctly failed persistent-store
  operations; no storage guard was weakened.
- **67** focused checks passed against the final committed source, exit 0.
  Syntax checks passed. The tutorial check now permits the explicit Zettel
  companion guide while retaining local checks for every MRW guide.
- Zettel: **4** registration/action checks and **46** existing Python checks
  passed, exit 0. Python used isolated PyYAML 6.0.3. Its manifest includes the
  new files and the previously omitted `prepare_book.py`; no Python tool or
  generated inventory snapshot was changed.
- Native VS Code **1.144.1**, WSL: **3/3** checks passed for preview copy,
  incoming note URI opening/Contents with a dirty draft, and Markdown clipboard
  link recovery. An earlier fixture failed while preparing an unrelated editor;
  the final fixture explicitly selected the default editor before dispatch.
- Running Obsidian/Templater **2.26.0** registered the actual named action.
  Invoking its callback with desktop dispatch captured produced the current
  note's URI; editor and saved file bytes stayed unchanged. A physical menu
  click through the operating-system URI router was not observed.
- Six supplied open-note file hashes, other Templater settings and original
  hotkeys were checked unchanged. **Alt+M** remains Insert math block,
  **Alt+W** WikilinkTitle, **Alt+T** Timestamp. Windows reported Ctrl+Alt+M
  already registered (error 1409); it was removed after the reported MobaXTerm
  collision. Windows and Obsidian both reported Alt+/ available before binding.

## Package and preservation

`vscode/mrw-0.22.5.vsix`: **565,683 bytes**, SHA-256
`7403d36e3308cda99cb9e825ccbb462424ff4583f6da2c09e1d8a41a05cfe118`. The established verifier passed against isolated
build inputs; all **101** installed payload files match (excluding the
installer's own manifest metadata). Code and media inputs were separately
compared with the working checkout, except generated build metadata.

The package preserves the already-installed local reader repair and records
`localChanges: true`. Automatic approval rejected replacing the checkout's
pre-existing dirty build marker; it was preserved, and only the isolated build
marker was generated. Other pending work and genuine study/source data remain
untouched. The working window was not reloaded; it must adopt 0.22.5 before the
new URI action can run there. Later package changes only corrected help and
build identity; production JS is identical to the native-tested package.

Opening MRW first, copying a per-note link and pasting it into Obsidian are no
longer needed for this action. One-time workspace configuration, activating the
installed MRW build, and occasional OS window-routing recovery remain. Existing
TikZ/LaTeX-preamble/embed preview limits are unchanged.
