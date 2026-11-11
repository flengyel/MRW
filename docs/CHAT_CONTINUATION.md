# Continuation prompt: Mathematical Research Workstation

Continue **MRW — Mathematical Research Workstation**, the experimental VS Code
console for mathematical study and research, in `flengyel/MRW`. This is the
application project. Keep mathematical manuscript development and theorem/model
searches in their own repositories.

Start from current `main`, inspect existing work and read `AGENTS.md`,
`CODEX_PLAN.md`, `docs/CODEX_CONTINUATION.md`, and the relevant workflow/design
documents. This prompt summarizes the conversation; it does not replace the
implementation roadmap. At preparation, `main` was
`501484af2ac4f1f0b989a585f057d9c1c5b08ca4`, and the latest regular release was
**0.23.11**. Recheck both before making current-state claims. Existing documents
contain historical sections; compare their status with current code and
delivery reports rather than repeating an obsolete task.

## Purpose and ownership

MRW connects ordinary notes, retained sources, study, calculations and formal
proofs, with a route back to unfinished work. Workflows remain experimental.
Support both study and a research lab notebook without requiring every activity
to become an exercise or a registered research question.

GPTWork reviews the design and produces concrete implementation instructions;
local Codex implements in VS Code connected to the Linux workspace. Follow
Microsoft's VS Code UX guidance. Keep the existing JavaScript extension and
shared Python core; do not introduce a replacement frontend or an unsolicited
TypeScript rewrite. VS Code owns ordinary editing, Save, Undo and recovery.

Windows VS Code with WSL2 is the principal documented arrangement. MRW/Python
run on the Linux workspace host; scoped Remote SSH checks also exist, including
Raspberry Pi 5. Native Windows/macOS backend support is not qualified. Ordinary
reading requires Python 3.11+ on the host, not Lean, SageMath, containers,
Obsidian or an AI account. The extension identity is `flengyel.mrw`; the Python
package, distribution and CLI are `mrw`, and the Lean namespace is `MRW`.

## Preserve what is implemented

- **Ordinary reading:** Markdown/Obsidian files in place, headings, links,
  WikiLinks, backlinks, exact supported Return destinations, mathematical
  notation and explicit TikZ rendering. Notes need no MRW conversion. Keep
  Obsidian and Zettel conventions optional. Opening a document must not create
  a study/problem record or bring back the removed Problems interface.
- **Source readers:** Stacks Project, Kerodon and nLab use source API 1.
  Preserve the native Stacks/Kerodon buttons and Original page/Saved text
  controls. nLab refuses embedding; retain its explicit browser fallback.
  Preserve exact revision-specific passages, hashes, qualified source IDs and
  separately attributed annotations. Reopening saved content must not require
  its producer plugin or silently replace it with current upstream text.
- **User-defined sources:** explicit data-profile and installed Python-adapter
  registration works without rebuilding MRW. Executable adapters are trusted
  installed code, not a sandbox. Clowder and PreTeXt remain candidates, not
  supported readers. Source acquisition, lesson content and computation are
  different plugin capabilities; do not force all of them through a parser API.
- **Study:** source-focused questions, attempts, attributed companion replies,
  optional FSRS review, and local history inspection/export are implemented.
  Archive/Restore, Trash/Undo and confirmed permanent deletion of Studies are
  delivered in 0.23.11. Do not reimplement them. Preserve their recovery,
  shared-record protection and opaque deletion markers.
- **Lean study:** the first companion unit to *Theorem Proving in Lean 4*,
  editable copied examples, notes, resume, and declarative local lesson packs
  are implemented. The delivered unit is core-only and pins Lean 4.33.0.
  Use the official Lean extension's native InfoView; do not scrape it or create
  another language client. Further units should explain terms, types, binders,
  hypotheses and proof construction generously, with checked examples and
  separately identified deliberate errors. Pack updates must not overwrite
  working copies.
- **Companion tools:** SageMath/Jupyter through `flengyel/sagepod`, LaTeX
  Workshop, Lean and Codex remain separate tools used alongside MRW. Opening
  MRW does not start containers, run notebook cells, compile Lean or send AI
  requests. Update SagePod documentation when an actual integration change
  affects it, without claiming those capabilities are implemented by MRW.

## Immediate follow-up: shared history and feature use

The latest requested increment is [configurable shared usage history](USAGE_HISTORY.md).
It is **not implemented in 0.23.11**; current study checkpoints/history use
private workspace storage. Extend the existing recorder and Inspect/Export
report rather than introducing another telemetry system.

Configure the MRW data directory independently of the Obsidian vault. Permit a
separate directory, a vault subdirectory, or the vault root itself. The preferred
arrangement in this discussion is a subdirectory such as `<vault>/MRW/`.
Selection does not authorize modifying unrelated notes. Syncthing on the Pi and
SyncTrayzor on Windows handle synchronization; MRW should not create a sync
service. The Pi has 8 GB RAM, not 16 GB; do not assume it can host large Lean
formalizations alongside everything else.

Use immutable batches per writer, stable logical IDs, deduplication and explicit
conflict/missing-data reporting. Keep credentials, locks, writer identities,
caches and host-specific paths outside synchronized content. Never have several
machines append to one log or write one shared database. Preserve deletion
semantics when an offline writer returns; synchronization must not resurrect
deleted study content. Do not claim deletion from disconnected backups.

Report feature invocation, completion, cancellation, failure, duration and last
use by version/writer/period. Distinguish available-but-unused, unavailable and
uninstrumented features. Make recording controllable and reports inspectable;
do not infer comprehension or usefulness from clicks. Avoid collecting note
contents or prompts merely to count use.

History sharing does not automatically synchronize active drafts, checkpoints,
scheduling state or the complete source store. Respect the separately documented
single-writer and filesystem limitations of that store. Test migrations and
offline/conflicting histories on disposable data before proposing real-data
adoption; preserve originals and verify the copied references before switching
an active binding.

## Subsequent integrations

**Zotero is an explicit priority**, still unimplemented. Link the existing
library's references and attachments with MRW notes, retained sources and
citations. Preserve bibliographic identity separately from attachment/content
revisions. Use the repository's integration design; do not move managed files
or make a bibliography association imply a mathematical dependency.

The **research lab notebook uses W3C PROV** as its common provenance model.
General PROV storage/export is a design goal, not a shipped service. Follow
[PROVENANCE_DESIGN.md](PROVENANCE_DESIGN.md): entities, activities, agents,
derivations, plans and bundles, with exact source/method revisions and explicit
missing context. VisTrails informs the treatment of alternative investigations
and their history; it is not a runtime dependency. The first bounded trial
should retain two alternative calculations and one failed run, reopen them
after restart, compare them and export the selected account. Opening or
exporting work executes nothing. PROV consistency does not establish
mathematical correctness.

Keep CoCalc, Wolfram, data analysis, repository imports of notes and Lean proofs,
Clowder and PreTeXt on the roadmap. Consult related systems before duplicating
their capabilities. Implement one justified increment at a time; a roadmap is
not blanket authorization to build every integration.

## Justification beyond provenance

Provenance records origins and activities; justification records the admitted
grounds and inference supporting a claim. Retain multiple grounds, assumptions,
challenges and revised contexts without converting source reputation into truth.
All sources, including nLab and AI responses, may require examination.

The justification subsystem is **partly implemented**, not merely proposed:
the Appendix A warrant slice and offline documentary-response bridge execute.
Read [JUSTIFICATION_LOGIC_EXPERIMENT.md](JUSTIFICATION_LOGIC_EXPERIMENT.md).
The repository-owned Lean project checks the bounded non-factive `J_0/J(CS)`
calculus; Python validates/persists/renders its bundles. Do not substitute another
repository's checker or reimplement the logic in Python.

Keep artifact/provenance, external verification, scoped premise admission,
contextual derivability and human judgment distinct. Application composes
reasons; sum offers alternative reasons and is not a confidence score or proof
of independent corroboration. A constant specification is not a list of trusted
authors/providers. No global factivity, automatic premise admission or
provider-wide truth bridge is supplied. Evidence that a model produced a
passage does not establish the passage's mathematical assertion. The
provider-backed Stage 1 mathematical trial remains pending; ordinary reading
and study do not wait for it.

## Delivery and communication

Preserve genuine notes, source revisions, annotations, drafts and the working
VS Code window. Do not repeat the completed rename or retained-source migration.
Use isolated fixtures for destructive tests. Existing authorization for a
specific task carries forward; make the work concrete and reviewable without
repeated permission requests or invented approval gates.

Run checks appropriate to the change, distinguish real host observations from
test doubles, and follow the repository's branch/review/release procedure.
Documentation-only work does not require a GUI or full compiler campaign.
Keep implementation status, workflow docs and the handoff consistent. Verify
remote `main` before claiming a merge/push. A GitHub release does not update the
installed extension automatically; preserve the regular-release intent and
do not install or reload the working window merely to validate a package.

Write concise public descriptions of what MRW can do and what remains planned.
Use “experimental console”; workflows are still being explored. Include the lab
notebook, W3C PROV and Zotero when relevant. Avoid marketing, uniqueness claims,
internal-refactoring announcements and claims of learning benefit unsupported
by observation.

Begin by checking whether the shared-history increment has advanced since the
recorded baseline. Continue its remaining authorized work, or prepare a precise
local-Codex handoff, while retaining Zotero and the bounded PROV trial as the
next integration priorities.
