module

public import Mathlib.Topology.Separation.Hausdorff
import StacksCore.Tactic.EgaSgaAttribute

/-!
# Fibre products over a Hausdorff space

## Main results

* `fibreProduct`: the fibre product `X ×_Z Y` of two maps, as a subset of `X × Y`.
* `fibreProduct_isClosed` (Stacks 08ZH): the fibre product of two continuous maps to a
  Hausdorff space is closed in the product.
-/

@[expose] public section

/-- The fibre product `X ×_Z Y` of two maps `f : X → Z` and `g : Y → Z`, realised as the
subset of `X × Y` consisting of the pairs `(x, y)` with `f x = g y`. -/
@[ega "I 3.4.2"]
def fibreProduct {X Y Z : Type*} (f : X → Z) (g : Y → Z) : Set (X × Y) :=
  {p : X × Y | f p.1 = g p.2}

/-- **Stacks 08ZH.** Let `f : X → Z` and `g : Y → Z` be continuous maps of topological spaces.
If `Z` is Hausdorff, then the fibre product `X ×_Z Y` is a closed subset of `X × Y`, being the
equaliser of `f ∘ Prod.fst` and `g ∘ Prod.snd`. -/
@[stacks 08ZH]
theorem fibreProduct_isClosed
    {X Y Z : Type*} [TopologicalSpace X] [TopologicalSpace Y] [TopologicalSpace Z]
    [T2Space Z] {f : X → Z} {g : Y → Z} (hf : Continuous f) (hg : Continuous g) :
    IsClosed (fibreProduct f g) :=
  isClosed_eq (hf.comp continuous_fst) (hg.comp continuous_snd)
