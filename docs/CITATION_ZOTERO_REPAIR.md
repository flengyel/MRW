# Zotero citations in existing notes — 14 November 2026

The Number Fields note contained `[@marcusNumberFields2018]`, but MRW rendered
it literally. Obsidian used live Zotero metadata; MRW used the companion's older
local export, which lacked that key. The WSL host also had Windows `pandoc.exe`
on PATH rather than the Linux `pandoc` command MRW tried.

The repair reuses the companion's selected live libraries through Better
BibTeX's read-only exact-key API. Explicit note/settings bibliographies retain
precedence. A missing or ambiguous key stays visible. An unavailable live lookup
may use a labelled local snapshot in auto mode; it does not invent a match.
The trusted host PATH now supplies Windows Pandoc after a missing Linux command.
No executable is taken from vault-controlled configuration.

## Observed behavior

An isolated native VS Code 1.146.0 WSL window opened the actual Number Fields
note read-only and displayed **(Marcus 2018)** plus its generated bibliography.
Zotero 10.0.8 and Better BibTeX 9.0.77 supplied the exact selected key from My
Library. The final visible-preview run took about 4.8 seconds; an earlier cold
run took about 7 seconds. Formatting is asynchronous, not an instant lookup.

The original note's SHA-256 before and after was
`fd9db8897fb1d828e03b9d3a3c37e69ec4dc2b673c74671a36950082aad4530e`.
A separate disposable dirty buffer remained unsaved and unchanged. The working
window, notes, Obsidian templates, bibliography export and Zotero library were
not modified. Screenshots and private fixture logs remain outside the repository.
An initial native fixture attempt encountered a first-run sign-in overlay and
a stale editor handle; the corrected disposable fixture used a URI edit and
completed. That failed attempt is retained alongside the successful observation.

## Boundaries and remaining limits

Lookup requests only cited keys in selected Better BibTeX libraries. Fixed
loopback transport, time/size limits and response identity checks bound the
adapter. No mutating Zotero method, whole-library export or guessed title match
is used. Generated bibliography belongs to the view; saved text is unchanged.
Current metadata is not an immutable retained source revision.

Tests cover known/missing/ambiguous keys, locators and prefixes, explicit local
precedence, unavailable-owner fallback, refusal to revive a missing live key,
WSL executable discovery, source preservation, focus refresh, request scopes,
malformed responses, and late responses after document close/disposal.
The release account records exact committed sources, package and check totals.

Standalone narrative `@key`, remote/dependent CSL styles and automatic matching
of Obsidian's remote style remain unsupported. Select a local independent CSL
style to control formatting. This repair formats citations; it does not check
mathematics or modify the note author's bibliography choices.

See [setup and behavior](ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes)
and [design reconciliation D22](DESIGN_RECONCILIATION.md).
