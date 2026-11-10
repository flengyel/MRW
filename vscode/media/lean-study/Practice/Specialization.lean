-- Exercise C: instantiate h at f b.
-- Intentionally unfinished; excluded from the default Study build.
namespace MRW.LeanStudy.Practice

theorem specialize_along
    (A B : Type) (S : A → Prop) (h : ∀ x : A, S x)
    (f : B → A) (b : B) : S (f b) :=
  _

end MRW.LeanStudy.Practice
