# README writing review, 15 November 2026

The two complete READMEs were reviewed against the implemented reading and
justification workflows. Their main defect was order: architecture preceded the
first task, while useful note, citation and notebook guidance followed the
license. Some justification text still described reader integration as pending.

The governing source was Knuth, Larrabee and Roberts, [*Mathematical
Writing*, Stanford report](https://www-cs-faculty.stanford.edu/~knuth/papers/cs1193.pdf),
Section 1, especially points 24 and 26, and Section 13, printed pages 28–29.
The user-manual discussion favors a motivated overview, concrete steps,
recognizable language and an explanation of recovery. The organization and
terminology decisions below apply that advice to software documentation;
they are not requirements stated by the book.

## Outline before revision

The baseline is main `0b4b18040ef78999a3dba2a34c03a7afff21d70d`.
In their original order:

- Root README: introduction (purpose/release); Architecture (implementation
  model); What works (capabilities); Open a document (first task); Host and
  installation (prerequisites); Recommended extensions (companions); Other
  reading tools (related tasks); Optional source study (separate workflow);
  Data and transfers (ownership/recovery); Limits and contributions (scope);
  Project documents and license (references); Zotero references (citations);
  Notebook results (retention); Notes while reading (creation/annotation).
- Extension README: introduction (purpose/release); Open a document (reading);
  Mathematics and diagrams (rendering); Workspace hosts and dependencies
  (requirements); Package and install a VSIX (delivery); Run from this checkout
  (development); Data and history (persistence), with Saved artifact location
  (moves); Study a difficult passage (optional workflow); Workflows
  (companions), with Link retained passages, Offline saved-source reader,
  Outline persistence boundary, Investigation persistence boundary, Obsidian
  companion notes and Reproduce outline host checks (specialized tasks);
  Development records and notices (references); Zotero references (citations);
  Moving a workspace (recovery); Notebook results (retention); Notes while
  reading (authoring).

Neither document states a new mathematical theorem. Its central question is
how to read, inspect supporting work and resume without copying one's notes
into a competing editor or registering a problem.

## Findings and repairs

| Location | Difficulty | Principle and repair |
| --- | --- | --- |
| Root opening and Architecture | Implementation vocabulary precedes the first useful action. | Section 1, points 24/26; Section 13. Lead with reading and place architecture after tasks and ownership. |
| Both final appended sections | Notes, citations and calculation results are hard to discover after the closing notices. | Editorial organization: move each task beside related reading/companion guidance. |
| Justification descriptions | The source-only API is presented without the new reader route. | Implementation accuracy: describe Euclid, explicit search, source buttons, withdrawal, predecessor and restart. |
| Both prerequisite sections | Lesson Lean and checker Lean could be confused. | Define before operational use: identify lesson 4.33.0 separately from checker 4.32.2, optional for ordinary reading. |
| Search descriptions | A reader could confuse conditional inference checks with arithmetic proof or prose/formal correspondence checks. | Preserve substantive scope: state the admissions and exactly what is checked at the point of use. |
| Data/move descriptions | A blanket storage claim could imply that one command transfers all private records. | Implementation accuracy: name the supported families and link the distinct workspace-move contract. |
| Extension developer section | An older host preparer is no longer the supported route. | Replace it with the owned-fixture preparer and isolation guide. |

## Definitions and revised order

“Ground”, “admission” and “context” are explained immediately before the first
justification task. Source identifiers are distinguished from revisions;
proof-graph structure, conditional derivability and mathematical checking remain
separate. CLI, VSIX and tool versions occur in installation/development guidance,
not as prerequisites for understanding the opening paragraphs.

The revised path is purpose → first reading task → notes → justification →
companions → host/setup → ownership/recovery → development/references. The root
README retains its task table and later architecture overview. Existing explicit
anchors used by other guides are preserved.

## Scope and checks

The complete Markdown sources were read and revised; no manuscript or theorem
was edited. Local link/fragment checks, tutorial tests, packaged-document byte
checks and the actual interface observations are recorded in the
[delivery report](RELEASE_0_23_42.md). The review does not certify mathematical
content or claim visual inspection of GitHub's rendered README.
