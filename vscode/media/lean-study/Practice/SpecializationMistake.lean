-- Deliberate error C: S b and S a need not be the same proposition.
namespace MRW.LeanStudy.DeliberateErrors

theorem bad_specialize (A : Type) (S : A → Prop)
    (h : ∀ x : A, S x) (a b : A) : S a :=
  h b

end MRW.LeanStudy.DeliberateErrors
