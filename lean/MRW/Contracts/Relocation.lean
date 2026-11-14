import Std

/-!
Executable abstraction of one workspace relocation and its immutable references.
The state is raw: candidates may carry the wrong identity/revision and invalid
operations may be requested. Successful publication is the only transition that
changes the current locator. Filesystem durability and hashes are abstracted by
the verified-copy comparison; see docs/CONTRACT_PILOT.md.
-/
namespace MRW.Contracts.Relocation

structure Target where
  logicalId : Nat
  captureId : Nat
  revision : Nat
  deriving DecidableEq, Repr

structure Citation where
  target : Target
  passage : Nat
  deriving DecidableEq, Repr

inductive Phase where
  | idle | preparing | verified | committed | aborted
  deriving DecidableEq, Repr

structure Candidate where
  locator : Nat
  target : Target
  deriving DecidableEq, Repr

structure State where
  currentLocator : Nat
  target : Target
  citation : Citation
  candidate : Option Candidate
  phase : Phase
  linked : Bool
  externalOriginalPresent : Bool
  deriving DecidableEq, Repr

inductive Event where
  | prepare (destination : Nat) (copy : Target)
  | verify
  | publish
  | recover
  | unlink
  deriving DecidableEq, Repr

/-- No proof or invariant is stored in a state or event. -/
def initial (target : Target) (passage locator : Nat) : State :=
  { currentLocator := locator, target, citation := ⟨target, passage⟩,
    candidate := none, phase := .idle, linked := true,
    externalOriginalPresent := true }

/-- A rejected operation returns `none`, leaving the caller's state unchanged. -/
def step (s : State) : Event → Option State
  | .prepare destination copy =>
    if (s.phase == .idle || s.phase == .committed || s.phase == .aborted) &&
        destination != s.currentLocator then
      some {s with candidate := some ⟨destination, copy⟩, phase := .preparing}
    else none
  | .verify =>
    match s.candidate with
    | none => none
    | some c =>
      if s.phase == .preparing && c.target == s.target then
        some {s with phase := .verified}
      else none
  | .publish =>
    match s.candidate with
    | none => none
    | some c =>
      if s.phase == .verified && c.target == s.target then
        some {s with currentLocator := c.locator, target := c.target, candidate := none, phase := .committed}
      else none
  | .recover =>
    if s.phase == .preparing || s.phase == .verified then
      some {s with candidate := none, phase := .aborted}
    else if s.phase == .committed || s.phase == .aborted then some s
    else none
  | .unlink => some {s with linked := false}

/-- The protected identity and citation, independently of mutable locators/links. -/
def Invariant (target : Target) (citation : Citation) (s : State) : Prop :=
  s.target = target ∧ s.citation = citation ∧ s.externalOriginalPresent = true

theorem initial_invariant (target : Target) (passage locator : Nat) :
    Invariant target ⟨target, passage⟩ (initial target passage locator) := by
  simp [Invariant, initial]

theorem step_preserves {target : Target} {citation : Citation} {s t : State}
    {event : Event} (inv : Invariant target citation s) (ok : step s event = some t) :
    Invariant target citation t := by
  cases event with
  | prepare destination copy =>
    simp only [step] at ok
    split at ok <;> simp_all [Invariant] <;> subst t <;> simp_all
  | verify =>
    simp only [step] at ok
    split at ok
    · simp_all
    · split at ok <;> simp_all [Invariant] <;> subst t <;> simp_all
  | publish =>
    simp only [step] at ok
    split at ok
    · simp_all
    · split at ok <;> simp_all [Invariant] <;> subst t <;> simp_all
  | recover =>
    simp only [step] at ok
    split at ok
    · simp_all [Invariant] <;> subst t <;> simp_all
    · split at ok <;> simp_all [Invariant] <;> subst t <;> simp_all
  | unlink => simp_all [step, Invariant] <;> subst t <;> simp_all

inductive Reachable (start : State) : State → Prop where
  | initial : Reachable start start
  | next {s t : State} (previous : Reachable start s) (event : Event)
      (accepted : step s event = some t) : Reachable start t

theorem reachable_invariant (target : Target) (passage locator : Nat) {s : State}
    (reachable : Reachable (initial target passage locator) s) :
    Invariant target ⟨target, passage⟩ s := by
  induction reachable with
  | initial => exact initial_invariant target passage locator
  | next previous event accepted ih => exact step_preserves ih accepted

/-- Recovery chooses authority from the persisted phase, never a guessed rollback. -/
theorem recovery_keeps_locator {s t : State} (ok : step s .recover = some t) :
    t.currentLocator = s.currentLocator := by
  simp only [step] at ok
  split at ok
  · simp_all <;> subst t <;> simp_all
  · split at ok <;> simp_all

/-- Removing a local association preserves the externally maintained original. -/
theorem unlink_preserves_original (s : State) :
    (step s .unlink).map State.externalOriginalPresent = some s.externalOriginalPresent := by
  rfl

/-- A nontrivial path exists for every identity, passage and two distinct locators. -/
theorem successful_relocation (target : Target) (passage source destination : Nat)
    (different : destination ≠ source) :
    ∃ final, Reachable (initial target passage source) final ∧
      final.currentLocator = destination ∧ final.phase = .committed := by
  let start := initial target passage source
  let prepared := {start with candidate := some ⟨destination, target⟩, phase := .preparing}
  let verified := {prepared with phase := .verified}
  let final := {verified with currentLocator := destination, target := target, candidate := none, phase := .committed}
  have prepare_ok : step start (.prepare destination target) = some prepared := by
    simp [step, start, initial, prepared, different]
  have verify_ok : step prepared .verify = some verified := by
    simp [step, prepared, verified, start, initial]
  have publish_ok : step verified .publish = some final := by
    simp [step, verified, prepared, final, start, initial]
  exact ⟨final, .next (.next (.next .initial _ prepare_ok) _ verify_ok) _ publish_ok, rfl, rfl⟩

end MRW.Contracts.Relocation
