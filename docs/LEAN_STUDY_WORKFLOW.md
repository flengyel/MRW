# Study Lean 4

Choose **Study Lean 4…** in MRW's **Commands** area, or run **MRW: Study Lean
4…** from the Command Palette. The introductory sequence has three lessons:

1. **Introduction and functions** explains what formalization entails and how
   the three constructions are related. It then defines terms, types, binders
   and scope before constructing and evaluating a composite function.
2. **Implication as a function on proofs** constructs a proof term, then follows
   the same argument through `intro`, `have` and `exact`.
3. **Dependent application** introduces proposition families and universal
   instantiation, with substitution in the result type.

The first entry opens with an [introduction](../vscode/media/lean-study/lessons/01-functions-and-proofs.md#introduction), followed by linked
[tutorial contents](../vscode/media/lean-study/lessons/01-functions-and-proofs.md#tutorial-contents).
Each lesson has links to its sections and back to those contents. The lessons
share the editable examples and associated note. Their primary text is
[*Theorem Proving in Lean 4*](https://lean-lang.org/theorem_proving_in_lean4/),
by Jeremy Avigad, Leonardo de Moura, Soonho Kong and Sebastian Ullrich, with
contributions from the Lean Community. The companion text and examples were
prepared with Codex for MRW and are separate from the book.

## Files and live goals

Open `Study/Examples.lean` in the code editor. Lean checks it as you edit;
the lesson's Markdown code blocks are illustrations, not editable code cells.
With `Examples.lean` focused, press **Ctrl+Shift+P** and choose **Lean 4:
InfoView: Display Goal**. The panel shows messages and proof goals at the cursor.

For the first computation, click `#eval compose ... 2`. Its message is `14`.
Change the final input `2` to `3`, observe `16`, then undo. No Run command or
terminal build is required. The adjacent `#check` lines display types. An
already completed function definition has no unfinished proof goal.

For the second lesson, inspect `implication_comp_tactic` before and after each
tactic. Before `exact hQR hQ`, the goal is `R` and `hQ : Q` is available;
after that tactic the proof is complete. For the third, hover over `h` and `a` in
`specialize` to inspect their types, then its later `#check` message.

Use the separate `Practice` links when you want to construct a term yourself.
Replace `_` with your proposed expression. An unfinished variation reports a missing
term; a deliberate error reports a type mismatch. Undo is available in the
native editor, and `Study/Solutions.lean` contains completed variations.

MRW opens the lesson preview and editable Lean examples as ordinary tabs.
The official Lean extension opens its InfoView beside the code. Switch between
the lesson and code tabs; resize the native groups to suit the display.

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

## Icons and controls

Hover over an icon to see its command name.

| Icon or label | What it does |
| --- | --- |
| `∀` in the editor toolbar | Opens the official Lean command menu, including InfoView and setup. |
| Pin in the InfoView | Keeps an additional view at this code location while you inspect another location. Unpin removes it. |
| Pause / Play | Freezes the displayed state / resumes updates. |
| Refresh, shown while paused | Updates the paused display once. |
| Cog beside the goal | Changes which assumptions and goal details are displayed. |
| MRW Document (list icon) | Opens MRW's document navigation menu. |

**Lean Study Actions…** is MRW's menu for the lesson, examples, notes and
variations. Lean's `∀` menu and InfoView controls belong to the official Lean
extension. Its [manual](https://github.com/leanprover/vscode-lean4/blob/master/vscode-lean4/manual/manual.md#status-bar)
describes the other controls. Use Pin to compare two locations; use Pause when
you want the display to stay still.

## Your working copy

**MRW: Lean Study Parent** selects the parent for new projects. The default
[MRW workspace setup](WORKSPACE_SETUP.md) sets it to `~/mrw-work` on Linux,
independently of the notes folder. If empty, **MRW: Notes Folder** supplies the
parent; otherwise a folder picker asks. Resuming a study keeps its existing
location, even after either setting changes. The project is created
at `<parent>/Lean Study/lean-foundations/`. No new vault is required. Files in
the installed extension remain untouched.

| File | Purpose |
| --- | --- |
| `lessons/01-functions-and-proofs.md` | Introduction, contents, functions and composition |
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
version. A pack update never silently replaces these files. Pack 1.1.4 supplies
the introduction, contents and three lessons for new copies. Earlier copies keep
their lesson files; updating the extension alone does not rewrite them. These
interaction instructions also apply to their unchanged examples.

## Actions and resumption

In the examples editor, choose **Lean Study Actions…** from the toolbar.
In the lesson preview or working note, choose **MRW Document → Lean Study
Actions…**. The action also appears in the Command Palette for these files.

In the working note, **Read lesson** reopens the lesson you were using.
**Return to prior MRW document** appears when MRW captured a reading location
on entry. The other actions open the working examples, InfoView, the associated
note, variations, solutions and deliberate errors. Book links open in the
external browser.

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

Add a local lesson using a [declarative lesson pack](LEAN_LESSON_PACKS.md).
