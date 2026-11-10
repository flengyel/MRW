import Std.Tactic
import MRW.Justification.Certificate

namespace MRW.Justification.AppendixA

open MRW.Justification

def kernelAssertion : String :=
  "KernelAttestation(verification-kernel-attestation-range-lifting-v1," ++
  "stdout-sha256:97953c4623e4c5815b7c73cfc613f969652a86fe3cf3d52399e178e696336c6a)"

def formalAssertion : String :=
  "LeanDeclaration(fdd1a01b893b125a802ea375aee051ab640c3be7," ++
  "dc6ea0ec50c29c9006b78adb088d4713508487ed," ++
  "CategoryTheory.Dom.exists_total_lift_iff_rangeLiftPullback_section," ++
  "exact-type-utf8-lf-sha256:" ++
  "0697f499e820e58fd6a2bddcde2f9eb5b2b2a23b436b9424bb676aa98910b83b)"

def manuscriptAssertion : String :=
  "SourceOccurrence(sha256:" ++
  "51c3669da3b3a850b1cf8f61f10f873f297d6a598f01d3541678137f002b1945," ++
  "lem:range-lifting-pullback-section,statement-utf8-sha256:" ++
  "cf70f020ab60e0a7b8b5b337d7f226d57787535f8fe1531bfa9b7f7f51a46849," ++
  "git-blob:5e87de9e9e040cec2a0dab3b3b4fed20d9ee955a)"

def kernelAtom : AtomKey := {
  id := "claim-kernel-attestation-range-lifting-v1"
  contentHash := "8e96be0e6f49e7af765e8871b9af576cb49e5c7e9170f209fcce9f47d2d33892"
}

def formalAtom : AtomKey := {
  id := "claim-formal-range-lifting-v1"
  contentHash := "2426d1fd21c803171e680ea2820ce4591157e8f5f2298368481c73671e0f1d0b"
}

def manuscriptAtom : AtomKey := {
  id := "claim-manuscript-range-lifting-v1"
  contentHash := "f9f7da6d4b33b5f39343b29cd1849861c62f64269398f13bbd188ceb2c4f245b"
}

def K : Formula := .atom kernelAtom
def FL : Formula := .atom formalAtom
def FM : Formula := .atom manuscriptAtom

def k : Term := .variable "k"
def p : Term := .variable "p"
def a : Term := .variable "a"

def premiseK : Formula := .reason k K
def premiseP : Formula := .reason p (.implication K FL)
def premiseA : Formula := .reason a (.implication FL FM)

def intermediatePK : Term := .application p k
def conclusionTerm : Term := .application a intermediatePK
def conclusion : Formula := .reason conclusionTerm FM

def metadata : ProfileMetadata := {
  id := "mrw-j0-appendix-a-v1"
  syntaxVersion := "justification-syntax-v1"
  ruleVersion := "j0-hilbert-v1"
  checker := "MRW.Justification.checkCertificate"
  checkerVersion := "justification-checker-v1"
}

def profile : Profile := .j0 metadata

def rawContext : RawContext := {
  id := "appendix-a-range-lifting-context-v1"
  profileId := metadata.id
  admissions := [
    { id := "admission-kernel-attestation-v1", formula := premiseK },
    { id := "admission-formal-proof-policy-v1", formula := premiseP },
    { id := "admission-reviewed-correspondence-v1", formula := premiseA }
  ]
}

theorem rawContext_valid : rawContext.isValid = true := by decide

def context : CheckedContext := ⟨rawContext, rawContext_valid⟩

def firstApplicationAxiom : Formula :=
  .implication premiseP
    (.implication premiseK (.reason intermediatePK FL))

def secondApplicationAxiom : Formula :=
  .implication premiseA
    (.implication (.reason intermediatePK FL) conclusion)

/-- Three premise leaves, two Application leaves, and four MP nodes. -/
def certificate : Certificate := {
  nodes := [
    { formula := premiseK,
      rule := .premise "admission-kernel-attestation-v1" },
    { formula := premiseP,
      rule := .premise "admission-formal-proof-policy-v1" },
    { formula := firstApplicationAxiom,
      rule := .axiom .application },
    { formula := .implication premiseK (.reason intermediatePK FL),
      rule := .modusPonens 2 1 },
    { formula := .reason intermediatePK FL,
      rule := .modusPonens 3 0 },
    { formula := premiseA,
      rule := .premise "admission-reviewed-correspondence-v1" },
    { formula := secondApplicationAxiom,
      rule := .axiom .application },
    { formula := .implication (.reason intermediatePK FL) conclusion,
      rule := .modusPonens 6 5 },
    { formula := conclusion,
      rule := .modusPonens 7 4 }
  ]
  conclusion := conclusion
}

theorem certificate_accepted :
    (checkCertificate profile context certificate).isSome = true := by
  decide

def checkedCertificate : CheckedCertificate profile context certificate :=
  (checkCertificate profile context certificate).get certificate_accepted

theorem conclusion_derivable : Derives profile context conclusion :=
  checkedCertificate.derivation

def attestationStdout : String :=
  "@Dom.exists_total_lift_iff_rangeLiftPullback_section : ∀ {C : Type u_2} [inst : Category.{u_1, u_2} C]\n" ++
  "  [inst_1 : PCategoryStruct C] [inst_2 : PCategory C] [inst_3 : HasRanges C] {X Y Z : C} (f : X ⟶ Y) {q : Z ⟶ Y}\n" ++
  "  (hq : PCategoryStruct.rst q = 𝟙 Z) (hρ : q ≫ HasRanges.ran f = q),\n" ++
  "  (∃ p, PCategoryStruct.rst p = 𝟙 Z ∧ p ≫ f = q) ↔\n" ++
  "    ∃ s, s ≫ Dom.pullbackSnd (Dom.sharp f) (Dom.sharpTotal q hq hρ) = 𝟙 (Dom.total Z)\n" ++
  "'CategoryTheory.Dom.exists_total_lift_iff_rangeLiftPullback_section' depends on axioms: [propext]\n"

end MRW.Justification.AppendixA
