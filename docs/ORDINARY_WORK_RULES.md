# Ordinary mathematical work — 0.23.4

The correction applies to future requirements as well as the removed interface:

1. Opening or following a document never creates a problem record or launches
   an exercise form.
2. Questions, solutions and commentary can remain where written, connected by
   ordinary links.
3. Additional interaction must remove a demonstrated obstacle without duplicate
   entry.

The [governing design](RESEARCH_WORKSTATION_DESIGN.md#rules-for-ordinary-mathematical-work),
AGENTS, CODEX_PLAN, continuation, vision, vocabulary and UX instructions now apply
these rules. The resumption design no longer calls for a Research Question
registration model, a new Research view or separate title/summary/next-action
fields. Its first task is recovering existing documents, supported locations and
unfinished work. Further controls depend on an obstacle encountered in use.

The README introduction, public-introduction guidance, extension README and
packaged tutorial describe ordinary linked notes. The existing public-readiness
review and earlier validation reports retain their original scope. The earlier
document-learning handoff is marked withdrawn; the completed terminology
handoff's roadmap is no longer an instruction for future work. Neither can
reauthorize the removed feature. There was no separate public-introduction draft in the checkout;
the README introduction and PUBLIC_READINESS guidance were updated.

This is a documentation patch. Runtime JavaScript, command/menu contributions,
settings, storage, existing notes, saved studies and history are unchanged.
0.23.4 distributes the revised tutorial and updates current package examples.

## Checks and delivery

The three existing tutorial checks passed. The extracted package's provider
shows **MRW 0.23.4**, contains the revised text, refreshes on both reopens and uses
a fresh URI on a new activation. This is a provider/API-double observation;
no new native rendered-interface observation is claimed. Runtime comparisons
confirm unchanged JavaScript. The package verifier passed; all
**105 installed payload files** match the VSIX.
A full runtime regression was not repeated for these documentation changes.
The [0.23.3 removal checks](DOCUMENT_PROBLEMS_REMOVAL.md) record the earlier
runtime verification.

Installed through the WSL host CLI without reloading the working window.
The revised help is adopted on the next normal reload.

Package: `vscode/mrw-0.23.4.vsix` (581965 bytes).

SHA-256: `ffc558644657882615acb77081cc2aba533d17678a71b46fb2b99feee9df6185`.

[Machine-readable evidence](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/ordinary-work-rules-20261108.json) records
source digests and actual package/help/install checks. Logs remain in
`.codex-work/vscode-host-reading-contract/evidence/`.
