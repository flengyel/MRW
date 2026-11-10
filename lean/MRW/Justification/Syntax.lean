namespace MRW.Justification

/-- An immutable opaque claim version. The checker compares this complete key. -/
structure AtomKey where
  id : String
  contentHash : String
deriving BEq, ReflBEq, LawfulBEq, DecidableEq, Repr

/-- Justification terms in the bounded non-factive slice. -/
inductive Term where
  | variable : String → Term
  | constant : String → Term
  | application : Term → Term → Term
  | sum : Term → Term → Term
deriving BEq, ReflBEq, LawfulBEq, DecidableEq, Repr

/-- Formulas over opaque atoms, falsity, implication, and reason assertions. -/
inductive Formula where
  | atom : AtomKey → Formula
  | bottom : Formula
  | implication : Formula → Formula → Formula
  | reason : Term → Formula → Formula
deriving BEq, ReflBEq, LawfulBEq, DecidableEq, Repr

namespace Formula

infixr:55 " ⟶ " => implication
notation:max term ":ᱼ" formula => reason term formula

end Formula

end MRW.Justification
