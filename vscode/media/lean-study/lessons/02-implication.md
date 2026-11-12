# Implication as a function on proofs

We shall compose two implications, then express the same proof as a sequence
of instructions to Lean. This uses application and abstraction from the first
lesson.

A **proposition** is a statement to be proved. Lean expresses a proposition
as a term of type `Prop`. A **proof** of a proposition `P` is a term of type
`P`. Thus `P : Prop` declares a proposition, whereas `hP : P` declares a proof
of that proposition.

[Tutorial contents](01-functions-and-proofs.md#tutorial-contents) ·
[Previous: functions](01-functions-and-proofs.md) ·
[Working examples](../Study/Examples.lean) · [Your notes](../Notes.md) ·
[Next: dependent application](03-dependent-application.md)

In the working examples, begin at `implication_comp`.

**In this lesson**

- [Composing implications](#composing-implications)
- [Constructing the proof with tactics](#constructing-the-proof-with-tactics)
- [Variation and error](#variation-and-error)

## Composing implications

An **implication** `P → Q` is the proposition that `Q` follows from `P`.
Its proof is a function that takes a proof of `P` and returns a proof of `Q`.
For `hPQ : P → Q` and `hP : P`, application therefore gives `hPQ hP : Q`.

Let $P$, $Q$ and $R$ be propositions, with proofs $h_{PQ}:P\to Q$ and
$h_{QR}:Q\to R$. To prove $P\to R$, assume that a proof $h_P:P$ is given.
Application gives a proof $h_{PQ}(h_P)$ of $Q$, then a proof
$h_{QR}(h_{PQ}(h_P))$ of $R$. Abstraction binds the assumed proof and gives
the required implication.

```lean
theorem implication_comp
    (P Q R : Prop)
    (hPQ : P → Q)
    (hQR : Q → R) :
    P → R :=
  fun hP : P => hQR (hPQ hP)
```

The keyword `theorem` introduces a named proof. The parameters declare the
propositions and the two assumed implication proofs. The result type `P → R`
states what remains to be proved, and the expression after `:=` supplies its
proof. All parameters belong to the theorem's statement: for every choice of
$P$, $Q$ and $R$, proofs of $P\to Q$ and $Q\to R$ yield a proof of $P\to R$.

In this construction, **discharging an assumption** means binding its proof
variable. The name `hP` is available inside the abstraction. The resulting
function accepts a proof of `P` whenever it is applied; constructing it does
not require a proof of `P` outside that scope.

The application pattern is the same as for `compose`. That particular
definition accepts type parameters in `Type`, while the parameters here are
propositions in `Prop`. The proof above declares its proposition parameters
explicitly and uses application and abstraction directly.

## Constructing the proof with tactics

A **goal** is the type of a term still to be constructed, together with the
context available for constructing it. A **tactic** is an instruction that
advances this construction. The keyword `by` begins a sequence of tactics;
Lean checks the proof term they produce.

```lean
theorem implication_comp_tactic
    (P Q R : Prop)
    (hPQ : P → Q)
    (hQR : Q → R) :
    P → R := by
  intro hP
  have hQ : Q := hPQ hP
  exact hQR hQ
```

Initially, the context contains the parameters, and the goal is `P → R`.
The following display illustrates this state. The symbol `⊢` separates the
available declarations from the goal.

```text
P Q R : Prop
hPQ : P → Q
hQR : Q → R
⊢ P → R
```

1. **`intro hP`** starts an abstraction by declaring `hP : P`. The goal becomes
   `R`: a proof of `R` must now be constructed with `hP` available.
2. **`have hQ : Q := hPQ hP`** names the intermediate proof `hQ`. Its type is
   `Q`, since `hPQ` is applied to a proof of `P`. The goal remains `R`.
3. **`exact hQR hQ`** supplies a term of the required type `R` and completes
   the proof.

After the `have` line, the context and goal are

```text
P Q R : Prop
hPQ : P → Q
hQR : Q → R
hP : P
hQ : Q
⊢ R
```

Place the cursor before `exact` in the working file and run
**MRW: Show Lean Study InfoView** to inspect the live state. Its formatting may
differ from this illustration.

The intermediate proof can also be used without naming it:

```lean
theorem implication_comp_short
    (P Q R : Prop)
    (hPQ : P → Q)
    (hQR : Q → R) :
    P → R := by
  intro hP
  exact hQR (hPQ hP)
```

The application `hPQ hP` still constructs the proof of `Q`; it now occurs
inside the final expression.

## Variation and error

Add `hP : P` as an explicit theorem parameter and make the result type `R`.
Construct that result using `hPQ`, `hQR` and `hP`. Compare the parameter list
with the theorem whose result is `P → R`. Open the
[variation](../Practice/Implication.lean) or its
[solution](../Study/Solutions.lean), under Variation B.

The [deliberate error](../Practice/ImplicationMistake.lean) ends with
`exact hPQ hP`. This term has type `Q`, but the goal is `R`. Applying `hQR`
to it supplies the required conclusion. A well-typed term solves a goal only
when its type agrees with that goal.

Further reading: *Theorem Proving in Lean 4*,
[Propositions and Proofs](https://lean-lang.org/theorem_proving_in_lean4/Propositions-and-Proofs/)
and [Tactics](https://lean-lang.org/theorem_proving_in_lean4/Tactics/).

[Previous: functions](01-functions-and-proofs.md) ·
[Tutorial contents](01-functions-and-proofs.md#tutorial-contents) ·
[Next: dependent application](03-dependent-application.md)
