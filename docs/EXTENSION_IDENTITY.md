# MRW extension identity

MRW 0.22.0 uses `flengyel.mrw` and `mrw-0.22.0.vsix`. This is the user's explicit
fresh start under the new application ID. There is no compatibility extension,
forwarder, legacy activation adapter or automatic migration. Install only MRW;
the earlier full `flengyel.theorem-terminal` extension is retired.

VS Code supplies new workspace/global state and storage for the new ID. Old
study checkpoints, history and UI selections are not automatically restored.
Original files are left on disk. Ordinary documents can still be opened in place.
The user separately requested the annotated Hausdorff source: a one-time verified
data copy preserves its exact retained source, reader annotations, provenance,
passage IDs and rendered diagrams through the existing saved-store interface.
That preservation is deployment work, not compatibility code in the extension.

New external links use `vscode://flengyel.mrw/…`; the parser rejects the old
extension authority. Source-qualified IDs, exact `mrw-outline:v1/v2` references,
command/view IDs, settings, existing filenames and Python record schemas remain
independent of the application name. No global replacement rewrites mathematics
or retained source bytes.

Install from the verified `mrw-0.22.0.vsix` in the intended Linux/WSL/SSH host.
Retire the old extension after preserving the requested source. Installation
preserves the working window; a normal later activation adopts the new identity.
Do not run both full extensions together. This release is not a Marketplace
publication or a new mathematical-checking capability.

Package identity, verification and preservation results follow in the delivery
record below.
