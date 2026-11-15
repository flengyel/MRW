import MRWRouteSearch
import MRW.Justification.AppendixA
import Lean.Data.Json.Printer

open MRW.Justification MRW.Justification.RouteSearch

def metadata : ProfileMetadata := ⟨"route-fixture", supportedSyntaxVersion,
  supportedRuleVersion, supportedChecker, supportedCheckerVersion⟩
def profile : Profile := .j0 metadata
private def atom (name : String) : Formula := .atom ⟨name, "fixture-" ++ name⟩
def A := atom "A"
def B := atom "B"
def C := atom "C"
def D := atom "D"
private def reason (name : String) (claim : Formula) : Formula := .reason (.variable name) claim

def raw : RawContext := ⟨"fixture-original", metadata.id, [
  ⟨"source-a", reason "a" A⟩,
  ⟨"a-to-b", reason "p" (.implication A B)⟩,
  ⟨"b-to-c", reason "q" (.implication B C)⟩,
  ⟨"source-d", reason "d" D⟩,
  ⟨"d-to-c", reason "r" (.implication D C)⟩]⟩
def context : CheckedContext := ⟨raw, by decide⟩

private def runSearch (c : CheckedContext) (goal : Formula) (limits : Limits := {}) :
    IO (State profile c) :=
  match search profile c goal limits with
  | .ok state => pure state
  | .error message => throw (IO.userError message)

private def makeContext (admissions : List Admission) : IO CheckedContext :=
  match checkContext ⟨"other-fixture", metadata.id, admissions⟩ with
  | some c => pure c
  | none => throw (IO.userError "Invalid fixture context")

def main : IO Unit := do
  let mut checks : List Lean.Json := []
  let check := fun (label : String) (ok : Bool) => do
    unless ok do throw (IO.userError label)
    return Lean.Json.mkObj [("check", .str label), ("passed", .bool true)]
  let original ← match search profile context C with
    | .error message => throw (IO.userError message)
    | .ok state => pure state
  let routes := forGoal original C
  checks := checks ++ [← check "two composed alternatives" (routes.length == 2)]
  checks := checks ++ [← check "exact admission footprints" (
    routes.any (fun r => admissionIds r.certificate == ["d-to-c", "source-d"]) &&
    routes.any (fun r => admissionIds r.certificate == ["b-to-c", "a-to-b", "source-a"]))]
  checks := checks ++ [← check "every route passes ordinary checker" (
    original.known.all (fun r => (checkCertificate profile context r.certificate).isSome))]
  checks := checks ++ [← check "search does not infer bare goal" (
    original.known.all (fun r => r.certificate.conclusion != C))]
  let successor ← match withdraw context "fixture-successor" ["a-to-b"] with
    | .error message => throw (IO.userError message)
    | .ok value => pure value
  let after ← match search profile successor C with
    | .error message => throw (IO.userError message)
    | .ok state => pure state
  checks := checks ++ [← check "one surviving alternative after withdrawal" ((forGoal after C).length == 1)]
  checks := checks ++ [← check "withdrawn leaf absent" (
    after.known.all (fun r => !(admissionIds r.certificate).contains "a-to-b"))]
  checks := checks ++ [← check "old context and routes remain usable" (
    context.raw == raw && routes.all (fun r => (checkCertificate profile context r.certificate).isSome))]
  checks := checks ++ [← check "dependent old certificate rejected in successor" (
    routes.any (fun r => (admissionIds r.certificate).contains "a-to-b" &&
      (checkCertificate profile successor r.certificate).isNone))]
  checks := checks ++ [← check "same or unknown successor rejected" (
    (withdraw context context.raw.id ["a-to-b"]).toOption.isNone &&
    (withdraw context "new" ["absent"]).toOption.isNone &&
    (withdraw context "new" ["a-to-b", "a-to-b"]).toOption.isNone)]
  let revisedGoal := Formula.atom ⟨"C", "changed-content"⟩
  checks := checks ++ [← check "claim content revision matters" ((forGoal original revisedGoal).isEmpty)]
  let limited ← match search profile context C {rounds := 0} with
    | .error message => throw (IO.userError message)
    | .ok value => pure value
  checks := checks ++ [← check "depth limit explicit, not underivability" (
    (forGoal limited C).isEmpty && limited.limitsHit.contains "rounds")]
  let capped ← match search profile context C {pairs := 1} with
    | .error message => throw (IO.userError message)
    | .ok value => pure value
  checks := checks ++ [← check "pair budget enforced" (capped.attemptedPairs == 1 && capped.limitsHit.contains "pairs")]
  checks := checks ++ [← check "unsupported budgets rejected" ((search profile context C {routes := 65}).toOption.isNone)]
  let badProfile := Profile.j0 {metadata with ruleVersion := "unsupported"}
  checks := checks ++ [← check "unsupported profile rejected" ((search badProfile context C).toOption.isNone)]
  let tiny ← runSearch context C {nodes := 1}
  checks := checks ++ [← check "node budget blocks construction" (
    (forGoal tiny C).isEmpty && tiny.limitsHit.contains "nodes")]
  let full ← runSearch context C {routes := 1}
  checks := checks ++ [← check "route budget is explicit" (
    full.known.length == 1 && full.limitsHit.contains "routes")]
  let equalLeaves ← makeContext [⟨"one", reason "x" A⟩, ⟨"two", reason "x" A⟩]
  let alternatives ← runSearch equalLeaves A
  checks := checks ++ [← check "equal terms retain distinct admission leaves" (
    (forGoal alternatives A).length == 2)]
  let curried ← makeContext [⟨"function", reason "f" (.implication A (.implication B C))⟩,
    ⟨"argument-a", reason "a" A⟩, ⟨"argument-b", reason "b" B⟩]
  let derivedMajor ← runSearch curried C
  checks := checks ++ [← check "derived implication can be a major premise" (
    (forGoal derivedMajor C).any (fun r => r.term == .application (.application (.variable "f") (.variable "a")) (.variable "b")))]
  let cyclic ← makeContext [⟨"seed", reason "a" A⟩, ⟨"cycle", reason "f" (.implication A A)⟩]
  let cycle ← runSearch cyclic A {rounds := 2}
  checks := checks ++ [← check "cyclic grounds terminate at round budget" (
    (forGoal cycle A).length == 3 && cycle.limitsHit.contains "rounds")]
  let noFactivity ← makeContext [⟨"reason-only", reason "a" A⟩]
  let nonfactive ← runSearch noFactivity B
  checks := checks ++ [← check "no arbitrary goal from an admitted reason" ((forGoal nonfactive B).isEmpty)]
  let bare ← makeContext [⟨"bare", A⟩, ⟨"bare-implication", .implication A B⟩]
  let bareResult ← runSearch bare B
  checks := checks ++ [← check "no invented reason for unlabelled premises" (bareResult.known.isEmpty)]
  let empty ← makeContext []
  let emptyResult ← runSearch empty C
  checks := checks ++ [← check "empty closure saturates without a false proof" (
    emptyResult.known.isEmpty && emptyResult.limitsHit.isEmpty)]
  let mismatch : Profile := .j0 {metadata with id := "different-profile"}
  checks := checks ++ [← check "context binding enforced" ((search mismatch context C).toOption.isNone)]
  checks := checks ++ [← check "duplicate admission IDs rejected" (
    (checkContext ⟨"duplicate", metadata.id, [⟨"same", reason "a" A⟩, ⟨"same", reason "b" B⟩]⟩).isNone)]
  let huge := (List.range 300).foldl (fun f _ => Formula.implication A f) B
  checks := checks ++ [← check "syntax traversal bounded" ((search profile context huge).toOption.isNone)]
  let many ← makeContext ((List.range 33).map fun n => ⟨toString n, reason "a" A⟩)
  checks := checks ++ [← check "admission count bounded" ((search profile many A).toOption.isNone)]
  let remainingContext ← match withdraw successor "fixture-no-routes" ["d-to-c"] with
    | .error message => throw (IO.userError message)
    | .ok value => pure value
  let remaining ← runSearch remainingContext C
  checks := checks ++ [← check "both withdrawn routes disappear without touching original" (
    (forGoal remaining C).isEmpty && (forGoal original C).length == 2)]
  let appendix ← match search AppendixA.profile AppendixA.context AppendixA.FM with
    | .error message => throw (IO.userError message)
    | .ok value => pure value
  checks := checks ++ [← check "existing range-lifting warrant discovered from its admissions" (
    (forGoal appendix AppendixA.FM).any (fun r => r.term == AppendixA.conclusionTerm))]
  IO.println ((Lean.Json.mkObj [("fixture", .str "synthetic alternative grounds"),
    ("checks", .arr checks.toArray), ("original_routes", .num routes.length),
    ("successor_routes", .num (forGoal after C).length)]).pretty)
