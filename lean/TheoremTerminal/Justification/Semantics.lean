import TheoremTerminal.Justification.Certificate

namespace TheoremTerminal.Justification

/-- Every active contextual premise is true in the targeted countervaluation. -/
def ContextCountermodelValid (context : CheckedContext) : Prop :=
  ∀ admissionId formula,
    context.provides admissionId formula = true →
    counterEvaluation formula = true

private theorem counterEvaluation_modusPonens
    {antecedent consequent : Formula}
    (majorTruth : counterEvaluation (.implication antecedent consequent) = true)
    (minorTruth : counterEvaluation antecedent = true) :
    counterEvaluation consequent = true := by
  cases antecedentValue : counterEvaluation antecedent <;>
  cases consequentValue : counterEvaluation consequent <;>
  simp_all [counterEvaluation]

/-- Every represented derivation preserves the targeted countervaluation. -/
theorem Derives.counterEvaluation_true {profile : Profile}
    {context : CheckedContext} (contextValid : ContextCountermodelValid context)
    {formula : Formula} (derivation : Derives profile context formula) :
    counterEvaluation formula = true := by
  induction derivation with
  | premise admissionId permitted =>
      exact contextValid admissionId _ permitted
  | logicalAxiom _ _ countermodelProof => exact countermodelProof
  | constantSpecification _ _ countermodelProof => exact countermodelProof
  | modusPonens _ _ majorTruth minorTruth =>
      exact counterEvaluation_modusPonens majorTruth minorTruth

/-- A false countervaluation target is not derivable from a true context. -/
theorem not_derivable_of_counterEvaluation_false {profile : Profile}
    {context : CheckedContext} (contextValid : ContextCountermodelValid context)
    {formula : Formula} (formulaFalse : counterEvaluation formula = false) :
    ¬ Derives profile context formula := by
  intro derivation
  have formulaTrue := derivation.counterEvaluation_true contextValid
  rw [formulaFalse] at formulaTrue
  contradiction

end TheoremTerminal.Justification
