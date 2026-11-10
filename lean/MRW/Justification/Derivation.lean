import MRW.Justification.ConstantSpecification

namespace MRW.Justification

inductive System where
  | j0
  | jcs
deriving BEq, DecidableEq, Repr

structure ProfileMetadata where
  id : String
  syntaxVersion : String
  ruleVersion : String
  checker : String
  checkerVersion : String
deriving BEq, Repr

structure RawProfile where
  metadata : ProfileMetadata
  system : System
  constantSpecification : Option RawConstantSpecification
deriving BEq, Repr

def supportedSyntaxVersion : String := "justification-syntax-v1"
def supportedRuleVersion : String := "j0-hilbert-v1"
def supportedChecker : String :=
  "MRW.Justification.checkCertificate"
def supportedCheckerVersion : String := "justification-checker-v1"

private def metadataValid (metadata : ProfileMetadata) : Bool :=
  !metadata.id.isEmpty &&
  metadata.syntaxVersion == supportedSyntaxVersion &&
  metadata.ruleVersion == supportedRuleVersion &&
  metadata.checker == supportedChecker &&
  metadata.checkerVersion == supportedCheckerVersion

inductive Profile where
  | j0 : ProfileMetadata → Profile
  | jcs : ProfileMetadata → CheckedConstantSpecification → Profile

namespace Profile

def metadata : Profile → ProfileMetadata
  | .j0 value => value
  | .jcs value _ => value

def id (profile : Profile) : String := profile.metadata.id

def system : Profile → System
  | .j0 _ => .j0
  | .jcs _ _ => .jcs

def permitsConstantSpecification (profile : Profile)
    (memberId : String) (formula : Formula) : Bool :=
  match profile with
  | .j0 _ => false
  | .jcs _ specification => specification.contains memberId formula

def constantSpecification? : Profile → Option CheckedConstantSpecification
  | .j0 _ => none
  | .jcs _ specification => some specification

/-- The metadata labels exactly the syntax, rules, and checker implemented here. -/
def isValid (profile : Profile) : Bool :=
  metadataValid profile.metadata

end Profile

def checkProfile (raw : RawProfile) : Option Profile :=
  if metadataValid raw.metadata then
    match raw.system, raw.constantSpecification with
    | .j0, none => some (.j0 raw.metadata)
    | .jcs, some specification =>
        (checkConstantSpecification specification).map fun checked =>
          .jcs raw.metadata checked
    | _, _ => none
  else
    none

structure Admission where
  id : String
  formula : Formula
deriving BEq, DecidableEq, Repr

structure RawContext where
  id : String
  profileId : String
  admissions : List Admission
deriving BEq, Repr

namespace RawContext

private def uniqueAdmissionIds : List Admission → Bool
  | [] => true
  | admission :: rest =>
      !rest.any (fun other => other.id == admission.id) && uniqueAdmissionIds rest

def isValid (context : RawContext) : Bool :=
  !context.id.isEmpty &&
  !context.profileId.isEmpty &&
  uniqueAdmissionIds context.admissions &&
  context.admissions.all (fun admission => !admission.id.isEmpty)

def provides (context : RawContext) (admissionId : String)
    (formula : Formula) : Bool :=
  context.admissions.any fun admission =>
    admission.id == admissionId && admission.formula == formula

end RawContext

structure CheckedContext where
  raw : RawContext
  valid : raw.isValid = true

def checkContext (raw : RawContext) : Option CheckedContext :=
  if h : raw.isValid = true then some ⟨raw, h⟩ else none

namespace CheckedContext

def provides (context : CheckedContext) (admissionId : String)
    (formula : Formula) : Bool :=
  context.raw.provides admissionId formula

end CheckedContext

/-- Contextual Hilbert derivability in the selected non-factive profile. -/
inductive Derives (profile : Profile) (context : CheckedContext) : Formula → Prop
  | premise {formula : Formula} (admissionId : String)
      (permitted : context.provides admissionId formula = true) :
      Derives profile context formula
  | logicalAxiom {formula : Formula} (kind : AxiomKind)
      (instanceProof : kind.isInstance formula = true)
      (countermodelProof : counterEvaluation formula = true) :
      Derives profile context formula
  | constantSpecification {formula : Formula} (memberId : String)
      (permitted : profile.permitsConstantSpecification memberId formula = true)
      (countermodelProof : counterEvaluation formula = true) :
      Derives profile context formula
  | modusPonens {antecedent consequent : Formula} :
      Derives profile context (.implication antecedent consequent) →
      Derives profile context antecedent →
      Derives profile context consequent

end MRW.Justification
