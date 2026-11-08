Repair MRW’s document-opening experience before starting another feature increment.

Reviewed baseline: origin/main `828bc8c`, MRW 0.23.1. Inspect newer local work first and preserve concurrent changes. The document-learning workflow is delivered; do not repeat it or require a manual problem session.

## 1. Remove the blocking vault scan

The current opening path passes an unresolved documentChoices promise to showQuickPick. Even Browse is unavailable until recursive enumeration and title reads finish. Windows worker failure can fall back to full recursive note indexing.

Replace this with an immediately usable native picker:

- Make **Browse for another document…** available without waiting for folder enumeration, title extraction or retained-source loading.
- Initially list files and subfolders in the current folder without descending recursively. Selecting a folder navigates into it; show the current path and provide parent navigation.
- Keep browsing location separate from the configured notes-folder scope. Browsing must not silently change that setting or broaden indexing permissions.
- Populate filenames first. Enrich displayed rows with bounded YAML/H1 titles asynchronously, preserving dirty-buffer titles, the search query and selected item.
- Provide an explicit **Search subfolders…** action for wider search. Show its scope, progress and incomplete-result status accurately.
- Cancel outstanding work when the picker closes, changes folder or is superseded. Discard late results.
- A failed or timed-out listing must leave Browse usable. Do not silently launch a full recursive content index as fallback.

Use a chooser-specific enumeration path. Do not lower shared DEFAULT_LIMITS or use shallow results to claim complete backlinks or unique note IDs.

Define “current folder only” through behavior and tests. The existing depth numbering starts at zero, and maxDepth 1 still traverses immediate subdirectories.

Preserve canonical-path and scope validation immediately before opening selected files.

## 2. Give document opening one clear entry point

Use **Open Document…** as the primary opening command.

The present parallel buttons—Open a note or paper and Open saved source—require understanding MRW’s storage model before choosing something to read. Present the distinction within the opening flow:

- **Original file:** opens its current contents in place.
- **Saved copy:** opens a previously retained revision and its MRW annotations.

Show title, path or source, and retained date/revision where available. Make both kinds discoverable without adding another mandatory explanatory dialog. Retained-source discovery must not block ordinary file browsing.

Preserve existing command IDs and specialized commands for compatibility and Command Palette access. Remove redundant primary buttons rather than adding another row of alternatives.

Opening an original must not import it. Opening a saved copy must not refresh or replace its retained revision. PDF opening continues through the existing host-reader handoff.

Use native controls, contextual descriptions, keyboard access and hover help. Keep the persistent Commands section and respect VS Code’s saved layout.

## 3. Close the remaining display question

In one disposable native window, inspect rendered Markdown after ordinary open/follow/Return and the rename/restore case.

The previous fixture verified editor selection and groups, but its final preview capture was blank. Determine whether that was a fixture artifact or a reproducible display defect. Repair demonstrated product behavior; do not treat a completed open command as proof that text rendered.

Preserve both sidebars, unrelated editors, dirty buffers and the 0.23.1 Return-origin repairs.

## 4. Repair the small confirmed export defect separately

Reviewing another problem’s solution during an attempt records `solution:<revision>` in helpExposures. History export then looks for a help response with that identifier and incorrectly reports “Linked help response unavailable,” despite the solution.review event and snapshot being present.

Resolve solution exposure through its own recorded event/snapshot identity. Preserve assistance classification and compatibility with existing records. Add a focused regression covering export across sessions.

## Verify and deliver

Test a deliberately delayed or failing worker: Browse must remain actionable before it finishes. Cover shallow navigation, explicit recursive search, asynchronous titles, cancellation, stale results and scope revalidation.

Measure time to usable Browse, first selectable filenames and title completion separately on the representative WSL/Windows notes location. Do not equate total indexing time with interface responsiveness.

Update current design instructions, README, workflow and bundled tutorial to explain the actual opening flow. Keep historical evidence intact.

Run applicable regression and package checks, commit and push to main, and install the verified package without forcing a working-window reload. Report the changes, timings, native observations and remaining limits. No new research dashboard, scheduler or mandatory user exercise belongs in this repair.
