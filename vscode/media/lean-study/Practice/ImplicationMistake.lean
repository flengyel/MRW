-- Deliberate error B: hPQ yields Q, while the goal requires R.
namespace MRW.LeanStudy.DeliberateErrors

theorem bad_implication
    (P Q R : Prop) (hPQ : P → Q) (hQR : Q → R) : P → R := by
  intro hP
  exact hPQ hP

end MRW.LeanStudy.DeliberateErrors
