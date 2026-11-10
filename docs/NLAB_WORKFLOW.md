# Reading nLab in MRW

Choose **Import Source… → nLab** and enter a page URL, for example
`https://ncatlab.org/nlab/show/adjoint+functor`. Choose **Whole page** or a heading
with its subsections. A valid heading fragment preselects that section; a missing
or unsupported fragment reports an error. The preview identifies the hash,
revision evidence, attribution, destination and producing plugin.

Names retain case, Unicode, punctuation, literal plus signs and slashes.
`nlab:adjoint%20functor` is the qualified identity; the website writes spaces as
`+`. `nlab:A%2BB%2F%CE%B1` retains the distinct name `A+B/α`. A heading fragment
is a location, not a different page identity.

MRW downloads the official HTML directly. A URL such as
`https://ncatlab.org/nlab/revision/adjoint+functor/156` must identify that exact
revision in the acquired page's Cite link. The nearby previous-revision link is
not used to infer a current number. Ordinary page imports are dated, hashed
snapshots without an asserted numbered revision. No Git mirror is combined with
that HTML. Complete acquired bytes, response URL, hash, revision evidence and
display/source mappings are retained.

**Saved text** renders the mathematical headings, supported MathML and inline
SVG. Site sidebars, scripts and generated contents are excluded from the reading
sequence, while the complete response stays available in **Open retained source**.
Unsupported media has a visible fallback at its location; MRW neither downloads
page scripts nor compiles its TeX. Local heading links scroll within the saved
scope. Links outside that scope open the site explicitly.

nLab sends `X-Frame-Options: DENY`; **Original page** explains that embedding is
unavailable. **Open in browser** opens its current official page. Offline reading,
annotations and exact citations need neither network nor the originating plugin.
Switching to the website does not update the saved revision or move notes.

nLab encourages use with source acknowledgement and says no more formal licence
has been agreed. MRW records that distinction and retains page-specific credits
in the original bytes. It does not substitute MRW's or Stacks Project's licence.
See the [nLab homepage](https://ncatlab.org/nlab/show/HomePage) and
[HowTo](https://ncatlab.org/nlab/show/HowTo).

Imports currently require UTF-8 HTML within 2 MiB, at most 120 mathematical
headings, and a retained passage under 256 KiB between adjacent headings. An
unsupported layout or exceeded bound reports an error. This is not complete nLab
coverage. Source hashes and structural validation are separate from mathematical
checking.
