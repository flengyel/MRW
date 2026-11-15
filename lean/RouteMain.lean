import MRWRouteIO

open MRW.Justification.RouteIO

def main : IO UInt32 := do
  try
    let stdin ← IO.getStdin
    let mut bytes := ByteArray.empty
    repeat
      let chunk ← stdin.read 65536
      if chunk.isEmpty then break
      bytes := bytes ++ chunk
      if bytes.size > 1024 * 1024 then throw (IO.userError "Request byte limit")
    let text ← match String.fromUTF8? bytes with
      | some text => pure text
      | none => throw (IO.userError "Invalid UTF-8 request")
    match runText text with
    | .error message => IO.eprintln message; return 1
    | .ok result =>
      let stdout ← IO.getStdout
      stdout.putStr result
      stdout.flush
      return 0
  catch error => IO.eprintln error.toString; return 1
