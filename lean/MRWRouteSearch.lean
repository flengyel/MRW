import MRW.Justification.Certificate

namespace MRW.Justification.RouteSearch

/-- Resource limits, not a claim of completeness for J₀ or J(CS). -/
structure Limits where
  rounds : Nat := 4
  routes : Nat := 64
  pairs : Nat := 16384
  nodes : Nat := 256
  deriving BEq, Repr

def Limits.valid (limits : Limits) : Bool :=
  limits.rounds ≤ 6 && 0 < limits.routes && limits.routes ≤ 64 &&
  0 < limits.pairs && limits.pairs ≤ 16384 &&
  0 < limits.nodes && limits.nodes ≤ 256

/-- Every retained candidate has already passed the ordinary certificate checker. -/
structure Route (profile : Profile) (context : CheckedContext) where
  term : Term
  claim : Formula
  certificate : Certificate
  checked : CheckedCertificate profile context certificate
  conclusion_eq : certificate.conclusion = .reason term claim

theorem Route.sound {profile : Profile} {context : CheckedContext}
    (route : Route profile context) :
    Derives profile context (.reason route.term route.claim) :=
  route.conclusion_eq ▸ route.checked.derivation

/-- Exact admission IDs in this route, including alternative leaves with equal formulas. -/
def admissionIds (certificate : Certificate) : List String :=
  certificate.nodes.foldl (fun ids node => match node.rule with
    | .premise id => if ids.contains id then ids else ids ++ [id]
    | _ => ids) []

private def accept (profile : Profile) (context : CheckedContext)
    (certificate : Certificate) : Option (Route profile context) := do
  let checked ← checkCertificate profile context certificate
  match h : certificate.conclusion with
  | .reason term claim => some ⟨term, claim, certificate, checked, h⟩
  | _ => none

private def shift (offset : Nat) (node : Node) : Node :=
  { node with rule := match node.rule with
    | .modusPonens major minor => .modusPonens (offset + major) (offset + minor)
    | rule => rule }

/-- Use the Application axiom and two MP steps; never infer A from t:A. -/
def applicationCertificate (major minor : Certificate) : Option Certificate := do
  match major.conclusion, minor.conclusion with
  | .reason f (.implication a b), .reason x a' =>
    if a != a' then none else
    let conclusion := Formula.reason (.application f x) b
    let axiomFormula := Formula.implication major.conclusion
      (.implication minor.conclusion conclusion)
    let n := major.nodes.length
    let m := minor.nodes.length
    if n == 0 || m == 0 then none else
    some {
      nodes := major.nodes ++ minor.nodes.map (shift n) ++ [
      {formula := axiomFormula, rule := .axiom .application},
      {formula := .implication minor.conclusion conclusion,
        rule := .modusPonens (n + m) (n - 1)},
      {formula := conclusion, rule := .modusPonens (n + m + 1) (n + m - 1)}]
      conclusion := conclusion }
  | _, _ => none

structure State (profile : Profile) (context : CheckedContext) where
  known : List (Route profile context) := []
  attemptedPairs : Nat := 0
  completedRounds : Nat := 0
  limitsHit : List String := []

private def mark (state : State profile context) (name : String) : State profile context :=
  if state.limitsHit.contains name then state
  else {state with limitsHit := state.limitsHit ++ [name]}

private def insert (limits : Limits) (state : State profile context)
    (route : Route profile context) : State profile context :=
  if state.known.any (fun old => old.certificate == route.certificate) then state
  else if state.known.length ≥ limits.routes then mark state "routes"
  else {state with known := state.known ++ [route]}

private def seed (profile : Profile) (context : CheckedContext) (limits : Limits) :
    State profile context :=
  context.raw.admissions.foldl (fun state admission =>
    let certificate : Certificate := {
      nodes := [{formula := admission.formula, rule := .premise admission.id}]
      conclusion := admission.formula}
    match accept profile context certificate with
    | none => state
    | some route => insert limits state route) {}

private def pair (profile : Profile) (context : CheckedContext) (limits : Limits)
    (state : State profile context) (major minor : Route profile context) : State profile context :=
  if state.attemptedPairs ≥ limits.pairs then mark state "pairs" else
  let state := {state with attemptedPairs := state.attemptedPairs + 1}
  -- Check size before constructing or rechecking a combined certificate.
  match major.claim with
  | .implication a _ =>
    if a != minor.claim then state
    else if major.certificate.nodes.length + minor.certificate.nodes.length + 3 > limits.nodes then
      mark state "nodes"
    else match applicationCertificate major.certificate minor.certificate with
    | none => state
    | some certificate => match accept profile context certificate with
      | none => state
      | some route => insert limits state route
  | _ => state

private def rounds (profile : Profile) (context : CheckedContext) (limits : Limits) :
    Nat → State profile context → State profile context
  | 0, state => mark state "rounds"
  | fuel + 1, state =>
    let before := state.known.length
    -- A round reads only the preceding frontier, in deterministic context order.
    let next := state.known.foldl (fun acc major =>
      state.known.foldl (fun acc minor => pair profile context limits acc major minor) acc) state
    let next := {next with completedRounds := next.completedRounds + 1}
    if next.limitsHit.contains "pairs" || next.limitsHit.contains "routes" then next
    else if next.known.length == before then next
    else rounds profile context limits fuel next

private inductive InputNode where
  | term : Term → InputNode
  | formula : Formula → InputNode

-- Count visited syntax nodes rather than just height: a shallow branching
-- input must not induce an exponential traversal before its budget is known.
private def inputSmall : Nat → List InputNode → Bool
  | _, [] => true
  | 0, _ => false
  | fuel + 1, .term (.variable name) :: rest
  | fuel + 1, .term (.constant name) :: rest =>
    name.utf8ByteSize ≤ 1024 && inputSmall fuel rest
  | fuel + 1, .term (.application a b) :: rest
  | fuel + 1, .term (.sum a b) :: rest =>
    inputSmall fuel (.term a :: .term b :: rest)
  | fuel + 1, .formula (.atom key) :: rest =>
    key.id.utf8ByteSize ≤ 1024 && key.contentHash.utf8ByteSize ≤ 1024 && inputSmall fuel rest
  | fuel + 1, .formula .bottom :: rest => inputSmall fuel rest
  | fuel + 1, .formula (.implication a b) :: rest =>
    inputSmall fuel (.formula a :: .formula b :: rest)
  | fuel + 1, .formula (.reason t a) :: rest =>
    inputSmall fuel (.term t :: .formula a :: rest)

/-- Bounded forward search over explicitly admitted reasons and Application.
It neither instantiates arbitrary Hilbert axioms nor uses factivity, CS search,
or a premise inferred from provenance. An empty result is not non-derivability. -/
def search (profile : Profile) (context : CheckedContext) (goal : Formula)
    (limits : Limits := {}) : Except String (State profile context) := do
  if !limits.valid then throw "Unsupported route-search limits"
  if !profile.isValid || profile.id != context.raw.profileId then throw "Profile/context mismatch"
  if context.raw.admissions.length > 32 || context.raw.id.length > 256 ||
      context.raw.admissions.any (fun a => a.id.length > 256 || !inputSmall 256 [.formula a.formula]) ||
      !inputSmall 256 [.formula goal] then throw "Input exceeds route-search limits"
  return rounds profile context limits limits.rounds (seed profile context limits)

/-- Select reasons for this exact goal version; equal display names are irrelevant. -/
def forGoal (state : State profile context) (goal : Formula) : List (Route profile context) :=
  state.known.filter (fun route => route.claim == goal)

theorem forGoal_sound {state : State profile context} {goal : Formula}
    {route : Route profile context} (member : route ∈ forGoal state goal) :
    Derives profile context (.reason route.term goal) := by
  have matched : route.claim = goal := by simpa using (List.mem_filter.mp member).2
  simpa [matched] using route.sound

/-- A successor changes the context ID and removes admissions without mutating its predecessor. -/
def without (context : RawContext) (successorId : String) (removed : List String) : RawContext :=
  {context with
    id := successorId
    admissions := context.admissions.filter (fun a => !removed.contains a.id)}

theorem without_subset (context : RawContext) (successorId : String) (removed : List String)
    (a : Admission) (member : a ∈ (without context successorId removed).admissions) :
    a ∈ context.admissions := by
  exact (List.mem_filter.mp member).1

theorem without_excludes (context : RawContext) (successorId : String) (removed : List String)
    (a : Admission) (member : a ∈ (without context successorId removed).admissions) :
    a.id ∉ removed := by
  simpa using (List.mem_filter.mp member).2

def withdraw (context : CheckedContext) (successorId : String) (removed : List String) :
    Except String CheckedContext := do
  if successorId.isEmpty || successorId == context.raw.id || successorId.length > 256 then
    throw "Use a new nonempty successor context ID"
  if removed.isEmpty || removed.eraseDups.length != removed.length ||
      removed.any (fun id => !context.raw.admissions.any (fun a => a.id == id)) then
    throw "Select distinct existing admission IDs to withdraw"
  match checkContext (without context.raw successorId removed) with
  | none => throw "Invalid successor context"
  | some checked => return checked

end MRW.Justification.RouteSearch
