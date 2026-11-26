# Proposed CoCalc adapter

Status: design proposal; no CoCalc adapter, authenticated connection or native
integration test is delivered by this document.

A CoCalc adapter would connect a remote project or notebook to the notes and
arguments that use it. CoCalc would retain collaborative editing, computation
and project management. GOLEM XIV would keep the association, retained result and
context needed to resume or compare the work.

## First workflow

1. From an existing note, select the CoCalc deployment, project and file to
   associate with the work. Retain the origin, project ID and file locator;
   a title alone is insufficient identity.
2. Open that target through the deployment's supported browser route and
   ordinary CoCalc authentication. Preserve the originating GOLEM XIV document and
   its supported Return location.
3. Edit, run and save in CoCalc using its native controls. Handoff itself
   submits no computation from GOLEM XIV.
4. Deliberately download/export the saved notebook and selected companion
   files. Retain those exact files through GOLEM XIV's existing
   [notebook-result workflow](NOTEBOOK_RESULTS.md), with the source association
   and available revision/execution metadata.
5. Reopen and compare retained results offline. A later export is a new capture;
   it does not replace the earlier result or restore a live kernel.

For example, associate a note about a conjecture with a CoCalc Sage notebook.
After trying two calculations in CoCalc, retain the saved alternatives and
compare them beside the note. Preserve a failed calculation as well. This
proposed round trip reuses existing capture and comparison; it does not require
another notebook editor or cloud computing service.

## Ownership and evidence

| Responsibility | Owner and boundary |
| --- | --- |
| Project and collaborative document lifecycle | CoCalc creates, edits, saves, renames and manages its project files through its supported interfaces. |
| Kernels and execution | CoCalc owns execution and its live state. A proposed GOLEM XIV execution action would require a later explicit operation contract. |
| Association and capture | GOLEM XIV keeps the external target separately from its own capture ID, exact retained bytes and links to notes or claims. |
| Authentication | The initial handoff reuses ordinary CoCalc authentication. Later authenticated operations must select the deployment/account/project explicitly and use supported scoped credentials outside research artifacts. |
| Revision and observed outcome | Record only available source revisions and actual observations. A URL, cell ID or saved output alone supplies no immutable revision, GOLEM XIV-observed run or independent reproduction. |
| Changed, moved or unavailable target | Preserve earlier captures and show the unresolved association. Relink explicitly when identity can be established; never substitute a same-title project. |

This first increment does not manage CoCalc accounts, collaborators, billing,
project startup/shutdown, live notebook synchronization or automatic reruns.
Opening a remote editor may have its own native lifecycle behavior; record that
separately from a GOLEM XIV-issued operation.

## Supported interfaces to evaluate

The CoCalc manual documents [project URLs](https://doc.cocalc.com/project-settings.html#project-url),
[file links](https://doc.cocalc.com/display-options.html) and
[native downloads](https://doc.cocalc.com/project-files.html). Those support the
browser-and-export starting point. Verify the selected deployment's exact routes.

For CoCalc.ai, the [CLI guide](https://cocalc.ai/docs/cli/use-cocalc-cli)
recommends task-specific commands; its
[HTTP API guide](https://cocalc.ai/docs/api/http-api) describes a narrower
integration interface. [Authentication and targets](https://cocalc.ai/docs/cli/authentication-and-targets)
separates site/profile selection from project selection. These documents
describe that deployment, not guaranteed compatibility with every CoCalc server.

Before authenticated reads or execution, pin the target deployment and supported
CLI/API version and document identities, permissions, resource limits,
cancellation and completion evidence. CoCalc.ai's
[notebook workflow](https://cocalc.ai/docs/cli/notebook-workflows) uses native
live-notebook commands rather than direct JSON writes while editing; its
[result contract](https://cocalc.ai/docs/cli/scripting-and-results) distinguishes
local command success from remote completion. Evaluate those contracts before
choosing an implementation. No CLI installation or login is part of this review.

## Acceptance for the first increment

Demonstrate the note → selected CoCalc file → exported capture → comparison →
Return route in an isolated project. Verify cancellation, denied access,
missing/renamed files, changed source and restart. Preserve dirty local
documents, remote originals and earlier captures; reopen retained work offline.
Identify unsupported source positions and unknown revisions explicitly.

The [integration contract](INTEGRATION_BOUNDARIES.md) governs the adapter.
The [design register](DESIGN_RECONCILIATION.md) retains current status alongside
the existing functional repairs. A later implementation requires native evidence;
this source review supplies no such evidence.
