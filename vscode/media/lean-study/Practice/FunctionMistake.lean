-- Deliberate error A: x has type A, but g requires an argument of type B.
namespace MRW.LeanStudy.DeliberateErrors

def bad_compose (A B C : Type) (g : B → C) (f : A → B) : A → C :=
  fun x : A => g x

end MRW.LeanStudy.DeliberateErrors
