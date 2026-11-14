import MRW.Contracts.Relocation

open MRW.Contracts.Relocation

private def target : Target := ⟨1, 2, 3⟩
private def other : Target := ⟨1, 2, 4⟩
private def start : State := initial target 7 10

/-- Shared trace vector: source 10, destination 20, logical 1/capture 2/revision 3. -/
def success : Option State := do
  let prepared ← step start (.prepare 20 target)
  let verified ← step prepared .verify
  step verified .publish

example : success.map State.currentLocator = some 20 := by decide
example : success.map State.target = some target := by decide
example : success.map State.citation = some ⟨target, 7⟩ := by decide
example : success.map State.phase = some .committed := by decide

example : step start .publish = none := by decide
example : step start (.prepare 10 target) = none := by decide
example : (step start (.prepare 20 other) >>= fun s => step s .verify) = none := by decide
example : (step start (.prepare 20 target) >>= fun s => step s .recover).map State.phase =
    some .aborted := by decide
example : (success >>= fun s => step s .recover).map State.currentLocator = some 20 := by decide
example : (success >>= fun s => step s .unlink).map State.externalOriginalPresent =
    some true := by decide

#print axioms MRW.Contracts.Relocation.initial_invariant
#print axioms MRW.Contracts.Relocation.step_preserves
#print axioms MRW.Contracts.Relocation.reachable_invariant
#print axioms MRW.Contracts.Relocation.successful_relocation
#print axioms MRW.Contracts.Relocation.recovery_keeps_locator
#print axioms MRW.Contracts.Relocation.unlink_preserves_original

private def recoveredBefore : Option State := do
  let prepared ← step start (.prepare 20 target)
  let verified ← step prepared .verify
  step verified .recover

private def recoveredAfter : Option State := success >>= fun s => step s .recover

private def phaseName : Phase → String
  | .idle => "idle"
  | .preparing => "preparing"
  | .verified => "verified"
  | .committed => "committed"
  | .aborted => "aborted"

private def summary : Option State → String
  | none => "null"
  | some s =>
    "{\"phase\":\"" ++ phaseName s.phase ++ "\",\"locator\":" ++ toString s.currentLocator ++
    ",\"target\":[" ++ toString s.target.logicalId ++ "," ++ toString s.target.captureId ++
    "," ++ toString s.target.revision ++ "],\"citation\":[" ++ toString s.citation.target.logicalId ++
    "," ++ toString s.citation.target.captureId ++ "," ++ toString s.citation.target.revision ++
    "," ++ toString s.citation.passage ++ "],\"externalOriginalPresent\":" ++ toString s.externalOriginalPresent ++ "}"

def main : IO Unit := do
  if success.map State.currentLocator != some 20 then
    throw (IO.userError "Relocation trace did not publish destination")
  IO.println ("{\"success\":" ++ summary success ++ ",\"recoveredBefore\":" ++ summary recoveredBefore ++
    ",\"recoveredAfter\":" ++ summary recoveredAfter ++ "}")
