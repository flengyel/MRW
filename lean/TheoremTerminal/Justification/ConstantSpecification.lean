import TheoremTerminal.Justification.Axioms

namespace TheoremTerminal.Justification

structure ConstantSpecificationMember where
  id : String
  formula : Formula
deriving BEq, DecidableEq, Repr

structure RawConstantSpecification where
  id : String
  revision : String
  members : List ConstantSpecificationMember
deriving BEq, Repr

/-- A positive-depth chain of constants terminating in a primitive axiom. -/
def isNestedAxiom : Formula → Bool
  | .reason (.constant name) inner =>
      !name.isEmpty && (isAxiomInstance inner || isNestedAxiom inner)
  | _ => false

/-- The next positive-depth suffix, if one exists. Bare axioms are not CS members. -/
def immediatePositiveSuffix? : Formula → Option Formula
  | .reason (.constant _) inner =>
      if isNestedAxiom inner then some inner else none
  | _ => none

namespace RawConstantSpecification

def contains (specification : RawConstantSpecification)
    (memberId : String) (formula : Formula) : Bool :=
  specification.members.any fun member =>
    member.id == memberId && member.formula == formula

private def uniqueMemberIds : List ConstantSpecificationMember → Bool
  | [] => true
  | member :: rest =>
      !rest.any (fun other => other.id == member.id) && uniqueMemberIds rest

private def uniqueMemberFormulas : List ConstantSpecificationMember → Bool
  | [] => true
  | member :: rest =>
      !rest.any (fun other => other.formula == member.formula) &&
        uniqueMemberFormulas rest

private def suffixPresent (specification : RawConstantSpecification)
    (member : ConstantSpecificationMember) : Bool :=
  match immediatePositiveSuffix? member.formula with
  | none => true
  | some suffix => specification.members.any fun candidate =>
      candidate.formula == suffix

def isValid (specification : RawConstantSpecification) : Bool :=
  !specification.id.isEmpty &&
  !specification.revision.isEmpty &&
  uniqueMemberIds specification.members &&
  uniqueMemberFormulas specification.members &&
  specification.members.all (fun member =>
    !member.id.isEmpty &&
    isNestedAxiom member.formula &&
    suffixPresent specification member)

end RawConstantSpecification

/-- A finite, exact, downward-closed CS. It is not claimed axiomatically appropriate. -/
structure CheckedConstantSpecification where
  raw : RawConstantSpecification
  valid : raw.isValid = true

def checkConstantSpecification
    (raw : RawConstantSpecification) : Option CheckedConstantSpecification :=
  if h : raw.isValid = true then some ⟨raw, h⟩ else none

namespace CheckedConstantSpecification

def contains (specification : CheckedConstantSpecification)
    (memberId : String) (formula : Formula) : Bool :=
  specification.raw.contains memberId formula

def find? (specification : CheckedConstantSpecification)
    (memberId : String) : Option ConstantSpecificationMember :=
  specification.raw.members.find? fun member => member.id == memberId

end CheckedConstantSpecification

end TheoremTerminal.Justification
