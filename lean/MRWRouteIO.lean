import MRWRouteSearch
import Lean.Data.Json.Parser
import Lean.Data.Json.Printer
import Lean.Data.Json.FromToJson.Basic

namespace MRW.Justification.RouteIO
open Lean RouteSearch

private def required (value : Option α) (message : String) : Except String α :=
  match value with
  | some item => .ok item
  | none => .error message

private def field (value : Json) (name : String) := value.getObjVal? name
private def string (value : Json) (name : String) : Except String String := do
  let text ← (← field value name).getStr?
  if text.isEmpty || text.utf8ByteSize > 1024 then throw "Invalid identifier"
  return text
private def keys (value : Json) (names : List String) : Except String Unit := do
  let object ← value.getObj?
  if object.size != names.length || !names.all object.contains then throw "Unexpected JSON fields"

private def term : Nat → Json → Except String Term
  | 0, _ => .error "Term nesting limit"
  | fuel + 1, value => do
    let a ← value.getArr?
    match (← required a[0]? "Missing term tag").getStr?, a.size with
    | .ok "variable", 2 => return .variable (← a[1]!.getStr?)
    | .ok "constant", 2 => return .constant (← a[1]!.getStr?)
    | .ok "application", 3 => return .application (← term fuel a[1]!) (← term fuel a[2]!)
    | .ok "sum", 3 => return .sum (← term fuel a[1]!) (← term fuel a[2]!)
    | _, _ => throw "Invalid term"

private def formula : Nat → Json → Except String Formula
  | 0, _ => .error "Formula nesting limit"
  | fuel + 1, value => do
    let a ← value.getArr?
    match (← required a[0]? "Missing formula tag").getStr?, a.size with
    | .ok "atom", 2 =>
      keys a[1]! ["id", "content_hash"]
      let digest ← field a[1]! "content_hash"
      keys digest ["algorithm", "value"]
      if (← string digest "algorithm") != "sha256" then throw "Expected SHA-256 claim version"
      let hash ← string digest "value"
      if hash.length != 64 || !hash.all (fun c => ('0' ≤ c && c ≤ '9') || ('a' ≤ c && c ≤ 'f')) then
        throw "Invalid claim hash"
      return .atom ⟨← string a[1]! "id", hash⟩
    | .ok "bottom", 1 => return .bottom
    | .ok "implication", 3 => return .implication (← formula fuel a[1]!) (← formula fuel a[2]!)
    | .ok "reason", 3 => return .reason (← term fuel a[1]!) (← formula fuel a[2]!)
    | _, _ => throw "Invalid formula"

private def termJson : Term → Json
  | .variable n => toJson [Json.str "variable", .str n]
  | .constant n => toJson [Json.str "constant", .str n]
  | .application a b => toJson [Json.str "application", termJson a, termJson b]
  | .sum a b => toJson [Json.str "sum", termJson a, termJson b]
private def formulaJson : Formula → Json
  | .atom key => toJson [Json.str "atom", Json.mkObj [("id", .str key.id),
    ("content_hash", Json.mkObj [("algorithm", .str "sha256"), ("value", .str key.contentHash)])]]
  | .bottom => toJson [Json.str "bottom"]
  | .implication a b => toJson [Json.str "implication", formulaJson a, formulaJson b]
  | .reason t a => toJson [Json.str "reason", termJson t, formulaJson a]
private def ruleJson : Rule → Json
  | .premise id => Json.mkObj [("kind", .str "premise"), ("admission_id", .str id)]
  | .axiom kind => Json.mkObj [("kind", .str "logical_axiom"), ("axiom_kind", .str kind.name)]
  | .constantSpecification id => Json.mkObj [("kind", .str "constant_specification"), ("member_id", .str id)]
  | .modusPonens a b => Json.mkObj [("kind", .str "modus_ponens"), ("major", toJson a), ("minor", toJson b)]
private def certificateJson (certificate : Certificate) : Json :=
  Json.mkObj [("conclusion", formulaJson certificate.conclusion),
    ("nodes", toJson (certificate.nodes.mapIdx fun i n => Json.mkObj [
      ("index", toJson i), ("formula", formulaJson n.formula), ("rule", ruleJson n.rule)]))]
private def routeJson (route : Route profile context) : Json :=
  Json.mkObj [("term", termJson route.term), ("claim", formulaJson route.claim),
    ("admission_ids", toJson (admissionIds route.certificate)),
    ("certificate", certificateJson route.certificate)]
private def contextJson (context : CheckedContext) : Json :=
  Json.mkObj [("id", .str context.raw.id), ("profile_id", .str context.raw.profileId),
    ("admissions", toJson (context.raw.admissions.map fun a => Json.mkObj [
      ("id", .str a.id), ("formula", formulaJson a.formula)]))]

/-- Decode an explicit context, search in Lean, and serialize checked certificates.
Metadata is echoed as data. Python separately binds it to retained sources. -/
def runJson (value : Json) : Except String Json := do
  keys value ["schema", "version", "id", "profile", "context", "claims", "sources", "admissions", "goal", "limits", "withdrawal"]
  if (← string value "schema") != "mrw.route-request" || (← (← field value "version").getNat?) != 1 then
    throw "Unsupported route request"
  let id ← string value "id"
  let p ← field value "profile"
  keys p ["id", "system", "syntax_version", "rule_version", "checker", "checker_version", "constant_specification"]
  if (← string p "system") != "J0" || (← field p "constant_specification") != .null then
    throw "This reader boundary supports J0 only"
  let metadata : ProfileMetadata := ⟨← string p "id", ← string p "syntax_version",
    ← string p "rule_version", ← string p "checker", ← string p "checker_version"⟩
  let profile ← required (checkProfile ⟨metadata, .j0, none⟩) "Unsupported profile"
  let admissions ← (← field value "admissions").getArr?
  if admissions.size > 32 then throw "Admission count limit"
  let all ← admissions.toList.mapM fun a => do
    return Admission.mk (← string a "id") (← formula 32 (← field a "formula"))
  if !(RawContext.mk "all" profile.id all).isValid then throw "Duplicate admission IDs"
  let c ← field value "context"
  let ids ← (← (← field c "admissions").getArr?).toList.mapM Json.getStr?
  if ids.length > 32 then throw "Context admission count limit"
  let selected ← ids.mapM fun name => required (all.find? (fun a => a.id == name)) "Unknown admission"
  let raw := RawContext.mk (← string c "id") (← string c "profile") selected
  let initial ← required (checkContext raw) "Invalid context"
  let w ← field value "withdrawal"
  let context ← if w == .null then pure initial else do
    let removed ← (← (← field w "removed").getArr?).toList.mapM Json.getStr?
    withdraw initial (← string w "successor_id") removed
  let l ← field value "limits"
  keys l ["rounds", "routes", "pairs", "nodes"]
  let limits : Limits := ⟨← (← field l "rounds").getNat?, ← (← field l "routes").getNat?,
    ← (← field l "pairs").getNat?, ← (← field l "nodes").getNat?⟩
  if limits.rounds > 4 || limits.routes > 16 || limits.pairs > 4096 || limits.nodes > 64 then
    throw "Retained-reader search budget exceeded"
  let goal ← formula 32 (← field value "goal")
  let state ← search profile context goal limits
  let mut routes : List Json := []
  let mut outputBytes := 0
  for route in forGoal state goal do
    let encoded := routeJson route
    outputBytes := outputBytes + encoded.compress.utf8ByteSize
    if outputBytes > 4 * 1024 * 1024 then throw "Route output budget exceeded"
    routes := routes ++ [encoded]
  return Json.mkObj [("schema", .str "mrw.route-response"), ("version", toJson (1 : Nat)),
    ("request_id", .str id), ("request", value), ("context", contextJson context),
    ("goal", formulaJson goal), ("routes", toJson routes),
    ("statistics", Json.mkObj [("known_routes", toJson state.known.length),
      ("attempted_pairs", toJson state.attemptedPairs), ("completed_rounds", toJson state.completedRounds),
      ("limits_hit", toJson state.limitsHit)])]

private def nestingValid (text : String) : Bool := Id.run do
  let mut depth : Int := 0
  let mut quoted := false
  let mut escaped := false
  for c in text.toList do
    if quoted then
      if escaped then escaped := false
      else if c == '\\' then escaped := true
      else if c == '"' then quoted := false
    else if c == '"' then quoted := true
    else if c == '[' || c == '{' then
      depth := depth + 1
      if depth > 48 then return false
    else if c == ']' || c == '}' then
      depth := depth - 1
      if depth < 0 then return false
  return depth == 0 && !quoted

def runText (text : String) : Except String String := do
  if text.utf8ByteSize > 1024 * 1024 then throw "Request byte limit"
  if !nestingValid text then throw "JSON nesting/shape limit"
  let value ← Json.parse text
  if text != value.compress ++ "\n" then throw "Use canonical JSON (no duplicate fields)"
  return (← runJson value).compress ++ "\n"

end MRW.Justification.RouteIO
