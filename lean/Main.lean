import TheoremTerminal.Justification.Bundle

open TheoremTerminal.Justification

def main (arguments : List String) : IO UInt32 := do
  match arguments with
  | ["--output", output] =>
      IO.FS.writeBinFile output appendixBundleBytes
      return 0
  | _ =>
      IO.eprintln "usage: justification_bundle --output PATH"
      return 2
