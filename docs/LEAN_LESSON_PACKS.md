# Lean lesson packs: content API 1

A lesson pack supplies files and references to MRW's installed Lean integration.
It supplies no executable MRW hooks and does not implement another language
integration. Registration is explicit; MRW never discovers packs by scanning
an arbitrary workspace.

The working example is [examples/lean-lesson-pack](../examples/lean-lesson-pack/pack.json).
Copy that directory outside the installation, then run **MRW: Add Lean Lesson
Pack…** and select it. **Study Lean 4…** immediately includes its identity-proof
lesson. No extension edit, rebuild or reload is needed. **Manage Lean Lesson
Packs…** enables, disables or removes registrations. Existing working copies
remain resumable when the source registration is disabled or removed.

## Manifest

Place `pack.json` at the pack root. API 1 accepts exactly these fields:

```json
{
  "apiVersion": 1,
  "packId": "external.identity-proof",
  "contentVersion": "1.0.0",
  "title": "External identity proof",
  "testedToolchain": "leanprover/lean4:v4.33.0",
  "projectFiles": ["lean-toolchain", "lakefile.toml", "Example.lean"],
  "notesTemplate": "Notes.md",
  "lessons": [{
    "id": "identity",
    "title": "A supplied proof",
    "order": 1,
    "explanation": "lesson.md",
    "examples": "Example.lean",
    "exercises": [],
    "solutions": [],
    "mistakes": [],
    "bookSections": [{
      "title": "Propositions and Proofs",
      "url": "https://lean-lang.org/theorem_proving_in_lean4/Propositions-and-Proofs/"
    }]
  }]
}
```

Use a stable `packId` independent of the installation path and content version.
IDs begin with a lowercase letter and use lowercase letters, digits, dots and
hyphens, up to 80 characters. Lesson IDs allow letters, digits and hyphens under
the same length rule. IDs and positive integer orders are unique within a pack.
`contentVersion` is a separate nonempty string of at most 80 characters; titles
are at most 200. There are 1–32 lessons, up to 32 project files, and up to 16
entries in each action/reference list. Each exercise, solution or mistake is
an object with exactly `title` and `file`.

Paths use forward slashes relative to the root. Absolute paths, `.` or `..`
components, empty components, backslashes, symlinks and redirected file paths
are rejected. Markdown paths end in `.md`; Lean paths end in `.lean`.
`projectFiles` additionally allows the required `lean-toolchain` and
`lakefile.toml`. The toolchain file must exactly match `testedToolchain` after
trimming whitespace. Pin `leanprover/lean4:vX.Y.Z` or a release candidate
`vX.Y.Z-rcN`. Book references use HTTPS without credentials. Shell commands,
JavaScript hooks and VS Code command URLs are not manifest fields.

The loader requires regular UTF-8 files, at most 1 MiB each, a 64 KiB manifest
and 4 MiB total declared content. These checks validate pack structure and local
references, not the mathematics or the safety of a Lean project. Register
trusted content: native Lean/Lake may execute user-written code through their
normal trusted editing and build workflow.

## Authoring and updates

Write a complete Markdown explanation, a pinned project, working Lean examples
and a notes template. Declare every required file. Put unfinished exercises and
deliberately failing files outside the project's default successful target;
offer them through the corresponding explicit actions. Compile completed code
with the declared toolchain and state the distinction between structural pack
validation, compiler results and mathematical review.

The first opening copies declared files to `<parent>/Lean Study/<packId>/`.
The copy contains a manifest snapshot, a small `.study-copy.json` ownership
marker and `.originals` seed text for explicit example reset. MRW keeps pack and
lesson IDs separate from its local root locator and code selection. It records
no server-internal identifier or inferred proof-completion state.

Later source-pack changes do not replace the copy's manifest, edits or notes.
Resume uses that retained manifest. A newly introduced lesson absent from an
older copy reports the mismatch without changing the resume identity. API 1 has
no automatic merge or upgrade operation. Continue using the retained version;
publish a distinct pack ID for genuinely separate content. Removing a
registration does not delete its working files.

The bundled pack lives in `vscode/media/lean-study/`; the installed integration
is `vscode/src/leanStudy.js`, and the data loader is `lessonPacks.js`.
The external example demonstrates content extensibility only. MRW's
[source plugins](SOURCE_PLUGINS.md) have their own source-acquisition contract.
