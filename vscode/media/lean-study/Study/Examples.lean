namespace MRW.LeanStudy.Intro

-- A. A function with explicitly named domain, middle type and codomain.
def compose
    (A B C : Type)
    (g : B → C)
    (f : A → B) :
    A → C :=
  fun x : A => g (f x)

#check compose
#check compose Nat Nat Nat (fun n => n + 10) (fun n => 2 * n)
#eval compose Nat Nat Nat (fun n => n + 10) (fun n => 2 * n) 2

-- B. Proof composition, with proposition parameters.
theorem implication_comp
    (P Q R : Prop)
    (hPQ : P → Q)
    (hQR : Q → R) :
    P → R :=
  fun hP : P => hQR (hPQ hP)

theorem implication_comp_tactic
    (P Q R : Prop)
    (hPQ : P → Q)
    (hQR : Q → R) :
    P → R := by
  intro hP
  have hQ : Q := hPQ hP
  exact hQR hQ

theorem implication_comp_short
    (P Q R : Prop)
    (hPQ : P → Q)
    (hQR : Q → R) :
    P → R := by
  intro hP
  exact hQR (hPQ hP)

-- C. The output proposition depends on the input a.
theorem specialize
    (A : Type)
    (S : A → Prop)
    (h : ∀ x : A, S x)
    (a : A) :
    S a :=
  h a

#check specialize
#print axioms implication_comp
#print axioms implication_comp_tactic
#print axioms specialize

end MRW.LeanStudy.Intro
