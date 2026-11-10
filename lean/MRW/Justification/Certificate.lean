import MRW.Justification.Derivation

namespace MRW.Justification

inductive Rule where
  | premise : String → Rule
  | axiom : AxiomKind → Rule
  | constantSpecification : String → Rule
  | modusPonens : Nat → Nat → Rule
deriving BEq, DecidableEq, Repr

namespace Rule

def references : Rule → List Nat
  | .modusPonens major minor => [major, minor]
  | _ => []

end Rule

structure Node where
  formula : Formula
  rule : Rule
deriving BEq, DecidableEq, Repr

structure Certificate where
  nodes : List Node
  conclusion : Formula
deriving BEq, Repr

structure CheckedNode (profile : Profile) (context : CheckedContext) where
  formula : Formula
  derivation : Derives profile context formula

private def nth? : List α → Nat → Option α
  | [], _ => none
  | value :: _, 0 => some value
  | _ :: rest, index + 1 => nth? rest index

private def checkNode (profile : Profile) (context : CheckedContext)
    (checked : List (CheckedNode profile context))
    (node : Node) : Option (CheckedNode profile context) :=
  match node.rule with
  | .premise admissionId =>
      if h : context.provides admissionId node.formula = true then
        some ⟨node.formula, .premise admissionId h⟩
      else
        none
  | .axiom kind =>
      if h : kind.isInstance node.formula = true then
        if hCountermodel : counterEvaluation node.formula = true then
          some ⟨node.formula, .logicalAxiom kind h hCountermodel⟩
        else
          none
      else
        none
  | .constantSpecification memberId =>
      if h : profile.permitsConstantSpecification memberId node.formula = true then
        if hCountermodel : counterEvaluation node.formula = true then
          some ⟨node.formula,
            .constantSpecification memberId h hCountermodel⟩
        else
          none
      else
        none
  | .modusPonens majorIndex minorIndex => do
      let major ← nth? checked majorIndex
      let minor ← nth? checked minorIndex
      match major with
      | ⟨.implication antecedent consequent, majorDerivation⟩ =>
          if antecedentMatches : minor.formula = antecedent then
            if consequentMatches : node.formula = consequent then
              let minorDerivation : Derives profile context antecedent :=
                antecedentMatches ▸ minor.derivation
              let result : Derives profile context consequent :=
                .modusPonens majorDerivation minorDerivation
              let nodeResult : Derives profile context node.formula :=
                consequentMatches.symm ▸ result
              some ⟨node.formula, nodeResult⟩
            else
              none
          else
            none
      | ⟨_, _⟩ => none

private def checkNodes (profile : Profile) (context : CheckedContext) :
    List Node → List (CheckedNode profile context) →
      Option (List (CheckedNode profile context))
  | [], checked => some checked
  | node :: rest, checked => do
      let result ← checkNode profile context checked node
      checkNodes profile context rest (checked ++ [result])

private def last? : List α → Option α
  | [] => none
  | [value] => some value
  | _ :: rest => last? rest

private def visitReferences (nodes : List Node) :
    Nat → List Nat → List Nat → List Nat
  | 0, _, visited => visited
  | _ + 1, [], visited => visited
  | fuel + 1, index :: pending, visited =>
      if visited.contains index then
        visitReferences nodes fuel pending visited
      else
        match nth? nodes index with
        | none => visitReferences nodes fuel pending visited
        | some node =>
            visitReferences nodes fuel
              (node.rule.references ++ pending) (index :: visited)

private def allNodesReachable (nodes : List Node) : Bool :=
  match nodes with
  | [] => false
  | _ =>
      let root := nodes.length - 1
      let visited := visitReferences nodes (2 * nodes.length + 1) [root] []
      (List.range nodes.length).all fun index => visited.contains index

private def footprintContains (footprint : List ConstantSpecificationMember)
    (member : ConstantSpecificationMember) : Bool :=
  footprint.any fun existing =>
    existing.id == member.id && existing.formula == member.formula

private def collectFootprint : List Node → List ConstantSpecificationMember →
    List ConstantSpecificationMember
  | [], footprint => footprint
  | node :: rest, footprint =>
      match node.rule with
      | .constantSpecification memberId =>
          let member := { id := memberId, formula := node.formula }
          let next := if footprintContains footprint member then footprint
            else footprint ++ [member]
          collectFootprint rest next
      | _ => collectFootprint rest footprint

structure CheckedCertificate (profile : Profile) (context : CheckedContext)
    (certificate : Certificate) where
  derivation : Derives profile context certificate.conclusion
  checkedNodes : List (CheckedNode profile context)
  constantSpecificationFootprint : List ConstantSpecificationMember

/-- Check a normalized ordered DAG and construct its kernel-checked derivation. -/
def checkCertificate (profile : Profile) (context : CheckedContext)
    (certificate : Certificate) :
    Option (CheckedCertificate profile context certificate) := do
  if !profile.isValid then none else pure ()
  if profile.id != context.raw.profileId then none else pure ()
  if !allNodesReachable certificate.nodes then none else pure ()
  let checked ← checkNodes profile context certificate.nodes []
  let root ← last? checked
  if conclusionMatches : root.formula = certificate.conclusion then
    let result : Derives profile context certificate.conclusion :=
      conclusionMatches ▸ root.derivation
    some {
      derivation := result
      checkedNodes := checked
      constantSpecificationFootprint := collectFootprint certificate.nodes []
    }
  else
    none

/-- Certificate-reflection soundness: accepted data denotes a derivation. -/
theorem checkCertificate_sound {profile : Profile} {context : CheckedContext}
    {certificate : Certificate}
    {checked : CheckedCertificate profile context certificate}
    (_accepted : checkCertificate profile context certificate = some checked) :
    Derives profile context certificate.conclusion :=
  checked.derivation

/-- A contextual J0 derivation uses no CS rule and lifts to any J(CS) profile. -/
theorem Derives.liftJ0 {metadata : ProfileMetadata} {context : CheckedContext}
    {formula : Formula} (specification : CheckedConstantSpecification)
    (derivation : Derives (.j0 metadata) context formula) :
    Derives (.jcs metadata specification) context formula := by
  induction derivation with
  | premise admissionId permitted => exact .premise admissionId permitted
  | logicalAxiom kind instanceProof countermodelProof =>
      exact .logicalAxiom kind instanceProof countermodelProof
  | constantSpecification memberId permitted countermodelProof =>
      simp [Profile.permitsConstantSpecification] at permitted
  | modusPonens _ _ major minor => exact .modusPonens major minor

end MRW.Justification
