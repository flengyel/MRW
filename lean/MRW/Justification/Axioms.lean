import MRW.Justification.Syntax

namespace MRW.Justification

/-- The exact primitive axiom schemes of rule version `j0-hilbert-v1`. -/
inductive AxiomKind where
  | k
  | s
  | exFalso
  | doubleNegation
  | application
  | sumLeft
  | sumRight
deriving BEq, DecidableEq, Repr

namespace AxiomKind

/-- Decide whether a formula is an instance of the selected tagged scheme. -/
def isInstance : AxiomKind → Formula → Bool
  | .k, .implication a (.implication _ a') => a' == a
  | .s,
      .implication
        (.implication a (.implication b c))
        (.implication (.implication a' b') (.implication a'' c')) =>
      a' == a && b' == b && a'' == a && c' == c
  | .exFalso, .implication .bottom _ => true
  | .doubleNegation,
      .implication (.implication (.implication a .bottom) .bottom) a' =>
      a' == a
  | .application,
      .implication
        (.reason jtS (.implication a b))
        (.implication (.reason jtT a') (.reason (.application jtS' jtT') b')) =>
      jtS' == jtS && jtT' == jtT && a' == a && b' == b
  | .sumLeft,
      .implication (.reason jtS a) (.reason (.sum jtS' _) a') =>
      jtS' == jtS && a' == a
  | .sumRight,
      .implication (.reason jtT a) (.reason (.sum _ jtT') a') =>
      jtT' == jtT && a' == a
  | _, _ => false

def name : AxiomKind → String
  | .k => "propositional-k"
  | .s => "propositional-s"
  | .exFalso => "propositional-ex-falso"
  | .doubleNegation => "propositional-double-negation"
  | .application => "justification-application"
  | .sumLeft => "justification-sum-left"
  | .sumRight => "justification-sum-right"

end AxiomKind

def axiomKinds : List AxiomKind :=
  [.k, .s, .exFalso, .doubleNegation, .application, .sumLeft, .sumRight]

def isAxiomInstance (formula : Formula) : Bool :=
  axiomKinds.any fun kind => kind.isInstance formula

/-- A targeted countervaluation used to prove the AI documentary premise non-factive. -/
def counterEvaluation : Formula → Bool
  | .atom _ => false
  | .bottom => false
  | .implication antecedent consequent =>
      !counterEvaluation antecedent || counterEvaluation consequent
  | .reason _ _ => true

end MRW.Justification
