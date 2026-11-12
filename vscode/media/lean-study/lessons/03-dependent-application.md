# Dependent application

Let $A$ be a type. A **family of propositions indexed by $A$** assigns a
proposition to each term of type $A$. Lean writes such a family as
`S : A → Prop`; for `a : A`, its value `S a` is a proposition.

A proof that covers every input can be applied to a chosen input. We shall
account for the result type of this application.

[Tutorial contents](01-functions-and-proofs.md#tutorial-contents) ·
[Previous: implication](02-implication.md) ·
[Working examples](../Study/Examples.lean) · [Your notes](../Notes.md)

This lesson uses terms, types and application from the first lesson, and
propositions and proofs from the second. In the examples, begin at `specialize`.

**In this lesson**

- [A proof for each input](#a-proof-for-each-input)
- [Substitution in the result type](#substitution-in-the-result-type)
- [Variation and error](#variation-and-error)

## A proof for each input

The **universal quantifier** `∀` expresses that a proposition holds for every
input. The proposition `∀ x : A, S x` says that `S x` holds for every `x : A`.
The binder `x : A` has scope `S x`.

A proof `h : ∀ x : A, S x` supplies, for each `a : A`, a proof of `S a`.
A **dependent
function type** specifies an input and a result type that may depend on that
input. Here it is written `(x : A) → S x`, equivalently `∀ x : A, S x`. A term
of such a type is a **dependent function**.

**Universal instantiation** obtains a proof at a specified input from a proof
of a universally quantified proposition. In Lean, it is application of `h`
to that input:

```lean
theorem specialize
    (A : Type)
    (S : A → Prop)
    (h : ∀ x : A, S x)
    (a : A) :
    S a :=
  h a
```

The parameters have distinct roles. The type `A` specifies the inputs. The
family `S` specifies a proposition at each input. The proof `h` supplies a
proof at every input, and `a` chooses the required one. The application `h a`
therefore has exactly the result type `S a`.

The family `S` specifies propositions; it does not itself supply their proofs.
For example, a family may assign to a natural number the proposition that it
equals zero. At input one this proposition has no proof, so this family admits
no proof of `∀ x : Nat, S x`. The theorem `specialize` assumes such a proof
as `h`; it does not construct one from `S`.

## Substitution in the result type

**Substitution** replaces the occurrences of a variable that refer to a given
declaration by a specified term. In dependent application, the supplied
argument replaces the bound variable in the result type.

Let $\Gamma$ be a context containing a type $A$, and let $T(x)$ be a type in
the extended context $\Gamma,x:A$. Write $T(a)$ for the result of substituting
$a$ for $x$ in this type. The **dependent application rule** is

$$
\frac{\Gamma\vdash h:(x:A)\to T(x)\qquad\Gamma\vdash a:A}
     {\Gamma\vdash h\,a:T(a)}.
$$

For `specialize`, the family $T(x)$ is the proposition $S(x)$. The application
has type $S(a)$, so its term is a proof of that proposition.

An ordinary function type `A → B` is the case `(x : A) → B` in which the
result type is independent of `x`. Similarly, the implication `P → Q`
accepts a proof of `P` and returns a proof of the fixed proposition `Q`.
Dependent application also substitutes into the result type: `h a : S a`
and `h b : S b` may prove different propositions.

## Variation and error

Add a type `B`, a function `f : B → A`, and an input `b : B`. Use `h` to prove
`S (f b)`. First determine the type of `f b`, then the type of the application
of `h` to it. Open the [variation](../Practice/Specialization.lean) or its
[solution](../Study/Solutions.lean), under Variation C.

The [deliberate error](../Practice/SpecializationMistake.lean) has parameters
`a b : A`, a goal `S a`, and the proposed proof `h b`. The proposed term has
type `S b`; the given declarations provide no identification with `S a`.
Using `h a` supplies a proof at the required input.

Further reading: *Theorem Proving in Lean 4*,
[Quantifiers and Equality](https://lean-lang.org/theorem_proving_in_lean4/Quantifiers-and-Equality/),
especially The Universal Quantifier.

[Previous: implication](02-implication.md) ·
[Tutorial contents](01-functions-and-proofs.md#tutorial-contents)
