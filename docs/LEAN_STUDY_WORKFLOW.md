# Study Lean 4

Choose **Study Lean 4…** in MRW's **Commands** area, or run **MRW: Study Lean
4…** from the Command Palette. The introductory sequence has three lessons:

1. **Functions and composition** defines terms, types, binders and scope before
   constructing and evaluating a composite function.
2. **Implication as a function on proofs** constructs a proof term, then follows
   the same argument through `intro`, `have` and `exact`.
3. **Dependent application** introduces proposition families and universal
   instantiation, with substitution in the result type.

The first lesson opens with a brief orientation and a linked
[tutorial contents](../vscode/media/lean-study/lessons/01-functions-and-proofs.md#tutorial-contents).
Each lesson has links to its sections and back to those contents. The lessons
share the editable examples and associated note. Their primary text is
[*Theorem Proving in Lean 4*](https://lean-lang.org/theorem_proving_in_lean4/),
by Jeremy Avigad, Leonardo de Moura, Soonho Kong and Sebastian Ullrich, with
contributions from the Lean Community. The companion text and examples were
prepared with Codex for MRW and are separate from the book.

## Files and live goals

MRW opens the lesson preview and editable Lean examples as ordinary tabs.
The official Lean extension opens its InfoView beside the code. Switch between
the lesson and code tabs; resize the native groups to suit the display.
Place the cursor before `exact hQR hQ` to inspect the context containing
`hP : P`, `hQ : Q` and remaining goal `R`.

The optional **Lean 4** extension, `leanprover.lean4`, supplies elaboration,
diagnostics, hovers, Go to Definition and live goals. Install it on the workspace
host. **In a WSL2 window, choose Install in WSL: Debian**, and install Lean/elan
on Debian, rather than relying on a Windows installation. See the
[official setup instructions](https://lean-lang.org/install/).
MRW uses its supported **Lean 4: InfoView: Display Goal** command
(`lean4.displayGoal`). It has no separate Lean server or live-goal API.

The bundled project pins `leanprover/lean4:v4.33.0`, matching the book version
checked for this unit. It needs only Lean core. Opening MRW starts no Lean build
or toolchain download. Opening Lean code lets the official extension perform
its normal project setup; a missing pinned toolchain may require installation
through that extension. No global elan default or research-project configuration
is changed. Without the extension, MRW still opens the explanation and code,
and offers the official setup link.

## Your working copy

If **MRW: Notes Folder** is configured, the first lesson uses it as the parent.
Otherwise an ordinary folder picker asks for a parent. The project is created
at `<parent>/Lean Study/lean-foundations/`. No new vault is required. Files in
the installed extension remain untouched.

| File | Purpose |
| --- | --- |
| `lessons/01-functions-and-proofs.md` | Functions and composition |
| `lessons/02-implication.md` | Implication and tactic proofs |
| `lessons/03-dependent-application.md` | Dependent application |
| `Study/Examples.lean` | Complete editable examples A, B and C |
| `Study/Solutions.lean` | Complete solutions to the three variations |
| `Notes.md` | Associated ordinary Markdown note |
| `Practice/*.lean` | Explicitly opened unfinished variations and deliberate errors |
| `lean-toolchain`, `lakefile.toml`, `Study.lean` | Dedicated core-only project and successful default build |

Save, undo and recover drafts through the native editors. The project and notes
remain usable without MRW or the original lesson pack. An occupied unrelated
folder is rejected. Reopening reuses the working copy, including its lesson
version. A pack update never silently replaces these files. Pack 1.1.1 supplies
the three lessons, orientation and contents for new copies. Earlier copies keep
their lesson files; updating the extension alone does not rewrite them.

## Actions and resumption

With the examples active, choose **MRW: Lean Study Actions…** in the editor
toolbar or Command Palette. It offers the explanation, examples, InfoView,
associated note, official book links, each variation, complete solutions,
deliberate errors and Return. Book links open in the external browser; this
increment does not bundle or embed the book.

**MRW: Return from Lean Study** restores the prior MRW Markdown document and
its exact captured source range. **MRW: Resume Lean Study** reopens the retained
lesson and code location in this workspace, including after closing their tabs
or restarting. Saved edits and notes remain in their files; VS Code owns unsaved
recovery. MRW tracks in-session edits to the return range. If the document changes
outside that tracking and the pin no longer matches, Return reports that it
cannot recover the exact range instead of guessing.

**Reset working examples in editor…** restores the original examples only after
confirmation. A concurrent edit cancels replacement. Reset leaves native Undo
available and does not save the file automatically. Notes are not reset.

Run `lake build` from the study project directory to check the completed
examples and solutions. The `Practice` files are excluded from that build.
Opening a variation or deliberate error individually is expected to show
unfinished goals or a type mismatch. Illustrated goals in the lesson are prose,
not stored live results. No checked badge survives an edit. Lean checking and
agreement with an intended informal theorem remain separate judgments.

Developers can reproduce the shipped-source checks without editing installed
files: from the repository root run
`python3 vscode/scripts/check-lean-lessons.py --output /tmp/mrw-lean-check`.
It uses the already installed pinned toolchain, copies projects to temporary
directories and records exact source hashes, compiler output and exit statuses.

There is no quiz, timer, registration form or AI-account requirement. Additional
local content is supported through [declarative lesson packs](LEAN_LESSON_PACKS.md).
