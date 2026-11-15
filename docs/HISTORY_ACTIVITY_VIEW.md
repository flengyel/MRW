# Read recorded activity

Run **MRW: Inspect Study History**. The initial view lists recorded commands
and substantive saved-study events, with their reported time, software version,
session and outcome. It requires no new Study or question record.

Repeated startup inventories and availability snapshots are collapsed to one
count. Empty study-measure tables and raw event dumps no longer fill this view.
Opening the report does not add another visible report-opening row. Scheduled,
test, demo and development records do not appear as ordinary production activity.

At most 100 activity entries are displayed. Sessions are ordered by their
reported timestamps; sequence order is retained within each session, even when
its wall clock moves backward. Clocks from separate writers may differ. The view
does not reconstruct a cross-device order or treat an absent record as zero work.

Operation endings use their explicit invocation links. Missing, inconsistent
or ambiguous links stay labelled. A completed handler means MRW returned from
that action; it does not establish completion of an external calculation or
proof. Recording gaps, disabled-recording observations, snapshot conflicts and
unclean/unobserved session endings remain visible in a short notices section.

**MRW: Export Study History… → Detailed comparison and coverage** provides the
existing usage tables and study measurements. **Events and submitted snapshots**
provides the existing JSON records and retained submitted work. These formats,
record IDs, links, sharing and deletion rules are unchanged. The compact view
does not read submitted snapshot bodies, rewrite records or remove evidence.

This is a presentation repair. The recorder's existing history read/sync path
is unchanged; the 100-entry display limit is not a new bound on loading a whole
private/shared history. Bounded feature-use inspection remains available through
the optional Diagnostics plugin. Missing observations, usefulness, comprehension
and mathematical checking remain separate questions.

See [shared history](USAGE_HISTORY.md), [feature use](OPERATIONAL_USAGE.md) and
[diagnostics](DIAGNOSTICS_PLUGIN.md).
