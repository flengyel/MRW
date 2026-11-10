# Folder rename preparation and reconnection — 2026-11-04

The user postponed renaming the development checkout after learning that its
nested genuine study had a separate path-bound workspace. Extension **0.12.0**
adds **Prepare Folder Rename…** and **Reconnect Saved Work After Folder Rename…**
over the existing verified artifact move/adopt core. [User workflow](FOLDER_RENAME_WORKFLOW.md).

## Scope

Preparation moves saved MRW artifacts to a UUID-named private directory under
the extension's host-local `globalStorageUri`. It requires one open project and
one stored project, freezes existing research clients and uses the unchanged
core transaction, recovery and exact cleanup rules. A convenience locator in
VS Code `globalState` is recorded only after completed preparation. Failure to
save that locator reports the committed location and the existing manual open
route; it never rolls back the store.

Reconnection requires an explicit choice and project mapping in an empty,
unbound workspace. It compares the inspected identity with the prepared locator
and invokes the existing complete-store adoption. Locators never establish
authority; the Python binding, identities and content validation still do.
No reference grammar, record schema, original source path, compiler, provider
or Qt behavior changes. Ordinary directory renaming remains a file-tool action.

## Automated evidence

Command tests use disposable Linux fixtures and the real Python bridge, with a
VS Code API double. They cover actual filesystem rename, opening a new workspace
storage home, explicit reconnection, unchanged exact passage links from before
the move and Unicode ranges, retained AI attribution, subsequent annotation saving and
restart. No synthetic fixture is counted as user study or mathematical benefit.

Additional cases cover unsaved reader drafts, cancellation, unfinished cleanup,
shortcut publication failure after a committed move, mismatched shortcut/store
identity, an already bound workspace and an existing study in the earlier
storage layout refusing a merge. The existing shared Python artifact suite covers transactional failures,
interruption recovery, stale clients, required investigation records, diagram
retention and explicit project mapping.

The final Node command/bridge suite passes all **8 test files**, including the
five new lifecycle/failure cases. The shared Python suite runs **379 tests:
317 passed, 62 skipped**, including the opt-in Qt/native diagram checks that
were not repeated. The 20 focused artifact service tests also pass. Actual
Extension Development Host evidence is separate from these API-double and
bridge results; host acceptance is not established by automated tests alone.

Preparation creates only the extension's child directory under VS Code's
existing host-local global storage and synchronizes that new directory entry
before the core may move records. A forced directory-sync failure blocks the
move and publishes no shortcut. An explicit retry must pass synchronization
again even when the first attempt left that empty directory present.

## Package and installed bridge

The verified **0.12.0** VSIX is installed in WSL under the unchanged extension
identity. Its **66 package files** have SHA-256
`f68e28976f04e5998040bf1f23c740b343cc24b0c845fcaefc7903924c884243`.
All **62 installed runtime/license files**, the production manifest and packaged
README match the archive. The installed isolated Python bridge answered an
artifact-status request against a fresh disposable home, with no real-store
access. This confirms the delivered package and bridge entry, not visible
command acceptance. Earlier VSIX archives are preserved.

Syntax, Python compilation, local documentation links/anchors, Markdown and
diff checks pass. The final archive was packaged only after the relevant final
regression completed. A preliminary archive predating the directory-sync repair
was retained privately and is not the installed package. See
[validation metadata](evidence/folder-rename-20261104/validation.json).

## Actual-host attempt

One isolated Windows VS Code/WSL Development Host launch was attempted using
the disposable `.codex-work/folder-rename-20261104` fixture and a separate
validation profile/user-data directory. It produced **no host report**. Startup
logged an existing-mutex/fallback-storage message and a safeStorage decryption
error. Those logs do not establish why the workflow did not start or an MRW
production defect. No launch/focus retry, user-window close/reload or acceptance
claim follows. The staged manifest was restored to the production entry and
the test configuration disabled to prevent delayed seeding. Preserve the trial.

The user later reported a new VS Code terminal requesting GitHub access,
successful authentication and enabling High Contrast mode. A read-only follow-up
found no host report, the test driver still disabled and the disposable fixture
still at its original path. The report does not establish that this was the
isolated validation window, why authentication was requested, successful MRW
rename/reconnection or accessibility acceptance. Preserve the user-interacted-with
window, its display setting and the trial; no driver reset or launch retry follows.

The committed `vscode/test/host/folderRename.js` driver uses real commands and
normal host storage, scripted choices, a disposable directory rename and
`vscode.openFolder` to exercise a new workspace. It is excluded from the VSIX.
Its intended persisted-`globalState`/reopen check remains **unobserved** in the
actual host; the successful lifecycle evidence above uses API doubles and the
real core. Mathematical usefulness remains unassessed.

## Preservation and remaining limits

The genuine Stacks study, its Codex explanation, existing overviews and notebooks,
the user-interacted-with TikZ trial, real artifact bindings and previous VSIX
archives are not migration fixtures. No preparation, rename or reconnection is
performed against them in this delivery. No API-key, mount, permission, Syncthing,
SagePod, Pi or notebook action is required. Windows-backed storage remains
unqualified; no live provider request is made.

The bounded workflow requires preparation before the ordinary rename, one
project per workspace/store and the same host/profile. It does not automatically
repair original-file paths, transfer editor recovery/UI pins, recover arbitrary
unprepared renames or prove distributed synchronization or mathematical benefit.
