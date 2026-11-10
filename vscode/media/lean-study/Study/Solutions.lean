namespace MRW.LeanStudy.Intro.Solutions

-- Variation A: three successive applications of an endofunction.
def thrice (A : Type) (f : A → A) : A → A :=
  fun x : A => f (f (f x))

#eval thrice Nat (fun n => n + 1) 2

-- Variation B: provide the proof of P as one more explicit parameter.
theorem implication_at
    (P Q R : Prop) (hPQ : P → Q) (hQR : Q → R) (hP : P) : R :=
  hQR (hPQ hP)

-- Variation C: specialize at an element supplied by a function.
theorem specialize_along
    (A B : Type) (S : A → Prop) (h : ∀ x : A, S x)
    (f : B → A) (b : B) : S (f b) :=
  h (f b)

#print axioms thrice
#print axioms implication_at
#print axioms specialize_along

end MRW.LeanStudy.Intro.Solutions
