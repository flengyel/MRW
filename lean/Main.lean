import TheoremTerminal.Justification.AIInteractionBundle

open TheoremTerminal.Justification
open TheoremTerminal.Justification.AIInteractionBundle

private def documentaryBundle (requestPath : String) : IO (Except String ByteArray) := do
  try
    let request ← IO.FS.readFile requestPath
    pure (bundleBytesFromText request)
  catch error =>
    pure (.error s!"could not read documentary warrant request: {error}")

def main (arguments : List String) : IO UInt32 := do
  match arguments with
  | ["--output", output] =>
      IO.FS.writeBinFile output appendixBundleBytes
      return 0
  | ["--documentary-warrant", requestPath, "--stdout"] =>
      match ← documentaryBundle requestPath with
      | .error message =>
          IO.eprintln s!"documentary warrant rejected: {message}"
          return 1
      | .ok bytes =>
          let stdout ← IO.getStdout
          stdout.write bytes
          stdout.flush
          return 0
  | ["--documentary-warrant", requestPath, "--output", output] =>
      match ← documentaryBundle requestPath with
      | .error message =>
          IO.eprintln s!"documentary warrant rejected: {message}"
          return 1
      | .ok bytes =>
          IO.FS.writeBinFile output bytes
          return 0
  | _ =>
      IO.eprintln
        "usage: justification_bundle --output PATH | --documentary-warrant REQUEST (--stdout | --output PATH)"
      return 2
