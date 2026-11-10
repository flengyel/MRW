# Functions, proofs and dependent application

Composition of functions and composition of implications use the same pattern:
apply one supplied map, then apply another. Lean expresses this pattern by
giving each expression a type. Universal instantiation extends application to
a function whose result type depends on its argument. These three constructions
provide a first way to read Lean code and understand why its steps are legal.

[Working examples](../Study/Examples.lean) · [Your notes](../Notes.md) ·
[Complete variation solutions](../Study/Solutions.lean)

**MRW: Lean Study Actions…** opens book sections, individual variations,
deliberate errors, the associated note and Return to your prior document.
**MRW: Resume Lean Study** reopens this explanation and your code location.
Save and undo in the ordinary editors. To see a live tactic state, put the
cursor in `Study/Examples.lean` and run **MRW: Show Lean Study InfoView**.
Lean's editor supplies hovers and Go to Definition. Resize its native editor
groups if the code or InfoView needs more room.

The primary text is [*Theorem Proving in Lean 4*](https://lean-lang.org/theorem_proving_in_lean4/),
by Jeremy Avigad, Leonardo de Moura, Soonho Kong and Sebastian Ullrich, with
contributions from the Lean Community. The companion explanations were prepared with Codex for MRW and are separate
from the book. The pack uses Lean **4.33.0**, with
core Lean only. A later edit is new code for Lean to check. The goal displays
below are explanatory illustrations, rather than captured live output.

## A. Composition of functions

Let $A$, $B$ and $C$ be types, and suppose that functions $f:A\to B$ and
$g:B\to C$ are given. For an input $x:A$, the result $f(x)$ is an admissible
input to $g$. Their composite therefore sends $x$ to $g(f(x))$.

```lean
def compose
    (A B C : Type)
    (g : B → C)
    (f : A → B) :
    A → C :=
  fun x : A => g (f x)
```

### The declaration, line by line

The word `def` introduces a definition. Its name is `compose`. The parameters
before the result type are inputs to the whole definition, in their written
order: `A`, `B`, `C`, `g`, then `f`. After those five inputs have been supplied,
the result is a function of type `A → C`. Evaluation of that resulting function
applies `f` before `g`, even though `g` occurs earlier in the parameter list.

The grouped binder `(A B C : Type)` abbreviates three binders,
`(A : Type) (B : Type) (C : Type)`. A **binder** introduces a name with its type
and specifies the portion of the expression in which that name is available.
The colon separates the name from its type. The types `A`, `B` and `C` are
available in the later binders, so the declarations of `g` and `f` can use them.

Here `Type` is Lean's lowest ordinary type universe, also written `Type 0`.
Types such as `Nat` and `Bool` can be supplied in these positions. `Type` itself
is classified by a higher universe; it is not a collection containing every
type at its own level. The three parameters of this definition are restricted
to `Type` as written. Universes beyond this first distinction will have their
own explanation later.

The binder `(g : B → C)` supplies a term `g` of the function type `B → C`.
The arrow describes the input and output types. The term `g` is the function;
`B → C` is its type. A term of a function type and the function type itself have
different roles, just as a particular linear map differs from a space of maps.
The analogy identifies their roles without identifying typing with set membership.

The colon after `(f : A → B)` introduces the result type after the parameters
have been supplied. This result type is `A → C`. The symbol `:=` introduces
the defining expression. It does not introduce another argument, or state a
proposition asserting an equality. The body supplies a function of the promised
type.

| Code line | Its role |
| --- | --- |
| `def compose` | Introduce the defined name. |
| `(A B C : Type)` | Receive the three ordinary types. |
| `(g : B → C)` | Receive the function applied to the intermediate result. |
| `(f : A → B) :` | Receive the function applied to the original input; introduce the result type. |
| `A → C :=` | Require a function from `A` to `C`; introduce its body. |
| `fun x : A => g (f x)` | Bind an input `x` and construct its output. |

Line breaks and indentation separate the declaration's parts. Parentheses
delimit binders and, in the body, the intermediate application. These parameters
are explicit: an application of `compose` supplies them. Implicit arguments can
be introduced later, after the roles of the explicit arguments are familiar.

### Application and abstraction

Lean writes function application by juxtaposition. Thus `f x` denotes the
application usually written $f(x)$. The expression `g (f x)` applies `g` to the
entire result `f x`. Without these parentheses, `g f x` would be parsed as
`(g f) x`: apply `g` to `f`, then apply the resulting term to `x`. Under our
declarations, `g` requires an element of `B`, not the function `f : A → B`.

The expression `fun x : A => t` constructs a function with input named `x` and
output given by `t`. The keyword `fun` begins the abstraction. The colon
specifies the input type, and `=>` separates its binder from the body. The name
`x` is bound in that body. In our example, the body is `g (f x)`. This `x` has no
separate meaning outside the abstraction. Another unused name could serve as
the bound input name without changing the function's application pattern.

A **context** $\Gamma$ is an ordered list of names with their declared types.
A declaration may use names introduced earlier in the list. The judgment

$$
\Gamma\vdash t:T
$$

says that the expression $t$ has type $T$ in that context. This judgment belongs
to the language in which we discuss Lean expressions. It is not a proposition
inside Lean asserting that $t$ belongs to a set $T$. For example, `x : Nat`
declares a natural-number variable; it does not supply a proof of `x ∈ Nat`.

For the defining body, take

$$
\Gamma=(A:\mathrm{Type},B:\mathrm{Type},C:\mathrm{Type},
        g:B\to C,f:A\to B).
$$

Temporarily extend this context by $x:A$. Then the typing proceeds as follows:

| Expression | Type | Reason |
| --- | --- | --- |
| `x` | `A` | The temporary binder supplies it. |
| `f x` | `B` | The function `f` accepts a term of type `A`. |
| `g (f x)` | `C` | The function `g` accepts the resulting term of type `B`. |
| `fun x : A => g (f x)` | `A → C` | Abstraction binds the temporary input. |

For fixed well-formed types $A$ and $B$, the **application rule** is

$$
\frac{\Gamma\vdash f:A\to B\qquad\Gamma\vdash a:A}
     {\Gamma\vdash f\,a:B}.
$$

The judgments above the line are premises. Given a function with input type
$A$ and a supplied term of that type, the application has the specified output
type. The two applications in our definition are legal because these input and
output types agree at the intermediate step.

The **abstraction rule**, when $B$ is independent of $x$, is

$$
\frac{\Gamma,x:A\vdash t:B}
     {\Gamma\vdash(\mathrm{fun}\ x:A\Rightarrow t):A\to B}.
$$

To construct a function, declare an arbitrary input $x:A$ temporarily and
construct its output. In the conclusion the input is bound, so `x` is no longer
a free assumption of the resulting function. Lean writes the separator as
`=>`; the rule uses $\Rightarrow$ to separate binder and body. Part C will let
the output type itself depend on the bound input.

The entire defined name also receives the five parameters declared above its
body. Its type can be read schematically as

```lean
(A B C : Type) → (B → C) → (A → B) → A → C
```

Arrows associate to the right. Supplying `A`, `B`, `C`, `g` and `f` leaves a
function of type `A → C`; supplying one further input of type `A` leaves a term
of type `C`. Parentheses in `(B → C)` and `(A → B)` show that each of these
whole functions is itself one argument to `compose`.

### Checking a type and evaluating an application

The working file contains:

```lean
#check compose
#check compose Nat Nat Nat (fun n => n + 10) (fun n => 2 * n)
#eval compose Nat Nat Nat (fun n => n + 10) (fun n => 2 * n) 2
```

The command `#check` asks Lean to elaborate an expression and display its type.
The second expression has type `Nat → Nat`: it supplies `Nat` for each type
parameter, a function adding ten for `g`, and a function doubling its input
for `f`. The input type of each anonymous function can be inferred from the
expected argument type at that position.

The command `#eval` computes a value for a computable expression. On input $2$,
the inner application gives $4$, and the outer application gives $14$. That is
the value expected from the last line. A type and an evaluated value answer
different questions: `#check` establishes this expression's type; `#eval`
computes this particular application.

**Variation A.** Given `A : Type` and `f : A → A`, define `thrice : A → A` by
three successive applications of `f`. Give the type of each intermediate
expression. The [unfinished variation](../Practice/Functions.lean) and
[complete solution](../Study/Solutions.lean) are separate files. The solution
also evaluates the construction at `Nat`, the successor function, and input $2$.

**Deliberate mistake A.** The [error file](../Practice/FunctionMistake.lean)
uses `g x` in `bad_compose`. In its context `x : A`, while `g` requires a term
of type `B`. Lean reports an application/type mismatch. The parameters `A` and
`B` are independent; nothing identifies them. Replacing `x` by `f x` supplies
the required type. This failing file is excluded from the default build.

Book reading: [Dependent Type Theory](https://lean-lang.org/theorem_proving_in_lean4/Dependent-Type-Theory/),
particularly Function Abstraction and Evaluation, and Definitions.

## B. Implication as a function on proofs

Let $P$, $Q$ and $R$ be propositions. Suppose that proofs of $P\to Q$ and
$Q\to R$ are supplied. To prove $P\to R$, temporarily suppose that a proof of
$P$ is given. Apply the first implication to obtain a proof of $Q$, then apply
the second to obtain a proof of $R$. Bind the temporary proof of $P$ to obtain
the required implication.

```lean
theorem implication_comp
    (P Q R : Prop)
    (hPQ : P → Q)
    (hQR : Q → R) :
    P → R :=
  fun hP : P => hQR (hPQ hP)
```

The keyword `theorem` introduces a named proof declaration. Its type states the
formal proposition to be proved; the expression after `:=` supplies its proof.
The binder `(P Q R : Prop)` declares propositions. A declaration `P : Prop`
does not supply a proof of `P`. The separate declaration `hP : P` supplies such
a proof. These colon expressions distinguish the proposition from a proof of it.

The parameter `hPQ : P → Q` is a proof of an implication. It transforms a
supplied proof of `P` into a proof of `Q`; it need not decide whether `P` is
true, or produce a proof of `P` on its own. The parameter `hQR : Q → R` likewise
transforms a supplied proof of `Q` into a proof of `R`.

| Code line | Its role |
| --- | --- |
| `theorem implication_comp` | Name the proof construction. |
| `(P Q R : Prop)` | Declare the proposition parameters. |
| `(hPQ : P → Q)` | Receive the first implication proof. |
| `(hQR : Q → R) :` | Receive the second implication proof; introduce the result type. |
| `P → R :=` | Require a proof transforming a supplied proof of `P` into a proof of `R`. |
| `fun hP : P => hQR (hPQ hP)` | Bind the supplied proof and construct the corresponding proof of `R`. |

With `hP : P` temporarily available, application gives `hPQ hP : Q` and then
`hQR (hPQ hP) : R`. Abstraction gives
`fun hP : P => hQR (hPQ hP) : P → R`. This is the formal meaning of discharging
the temporary assumption. A free proof `hP : P` is not required as a further
parameter outside the resulting implication.

All parameters before the result type are part of the whole theorem's
quantified statement:

$$
\forall P,Q,R:\mathrm{Prop},\quad
(P\to Q)\to(Q\to R)\to(P\to R).
$$

The construction works for any propositions and any supplied proofs of the two
implications. Applying the theorem supplies its explicit parameters in their
declared order.

This proof has the application pattern from Part A, but it is a separate
declaration. The parameters `A`, `B`, `C` of the named `compose` must have type
`Type`. A proposition `P : Prop` cannot simply be supplied in one of those
positions: its type is `Prop`. Here we declare proposition parameters and
construct their proof function directly. A later `Sort`-polymorphic
construction will express both patterns with a common abstraction.

### The tactic proof, one step at a time

The longer proof names the intermediate proof of `Q`:

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

The word `by` begins proof construction by tactics. A **goal** records the type
of a missing term and the context in which it may be constructed. Lean starts
with the expected type `P → R`. Tactics direct the construction of a proof term;
Lean checks the resulting term.

Initially the context contains `P Q R : Prop`, `hPQ : P → Q` and
`hQR : Q → R`. An illustrative display is:

```text
P Q R : Prop
hPQ : P → Q
hQR : Q → R
⊢ P → R
```

The symbol `⊢` marks the remaining goal. Declarations above it are available
for constructing a proof; the expression below it is the type of the proof
still needed.

1. **`intro hP`.** Bind the input proof of the implication and name it `hP`.
   The context gains `hP : P`, and the remaining goal becomes `R`. At the term
   level this constructs the beginning `fun hP : P => ...`.
2. **`have hQ : Q := hPQ hP`.** Introduce a local proof named `hQ`, with required
   type `Q`. The expression to the right of `:=` has that type by application,
   so this line supplies the local proof immediately. The remaining goal is
   still `R`, now with `hQ : Q` available too.
3. **`exact hQR hQ`.** Supply a term for the whole remaining goal. Application
   gives `hQR hQ : R`, the required type. No goal remains in this proof.

| Mathematical step | Explicit term | Effect on context and goal |
| --- | --- | --- |
| Temporarily assume a proof of `P`. | `fun hP : P => ...` | `intro hP` adds `hP : P`; goal `P → R` becomes `R`. |
| Apply the implication from `P` to `Q`. | `hPQ hP : Q` | `have hQ : Q := hPQ hP` adds `hQ : Q`; goal remains `R`. |
| Apply the implication from `Q` to `R`. | `hQR (hPQ hP) : R` | `exact hQR hQ` supplies the missing proof of `R`. |

Immediately after the `have` line, the illustrative display is:

```text
P Q R : Prop
hPQ : P → Q
hQR : Q → R
hP : P
hQ : Q
⊢ R
```

To inspect the live counterpart, place the cursor before `exact` in the working
file and open the native InfoView. A cursor before a tactic describes what it
is being asked to solve; a position after it can show the result of that step.
The precise displayed names and formatting belong to Lean's current printer.

With the intermediate term understood, the shorter proof can use it directly:

```lean
theorem implication_comp_short
    (P Q R : Prop) (hPQ : P → Q) (hQR : Q → R) : P → R := by
  intro hP
  exact hQR (hPQ hP)
```

The local name `hQ` is omitted. The application producing a proof of `Q` remains
inside the final expression.

**Variation B.** Add an explicit parameter `hP : P` to the theorem and make its
result type `R`. Construct that result using `hPQ`, `hQR` and `hP`. Compare this
parameter list with the implication-valued result above. Open the
[unfinished variation](../Practice/Implication.lean) or the
[complete solution](../Study/Solutions.lean).

**Deliberate mistake B.** The [error file](../Practice/ImplicationMistake.lean)
ends with `exact hPQ hP`. The goal after `intro` is `R`, but the proposed term
has type `Q`. Lean reports a mismatch. A term may be well typed in its own
right and still have the wrong type for the current goal. Applying `hQR`
supplies the required conclusion.

Book reading: [Propositions and Proofs](https://lean-lang.org/theorem_proving_in_lean4/Propositions-and-Proofs/)
and [Tactics](https://lean-lang.org/theorem_proving_in_lean4/Tactics/).

## C. A genuinely dependent result type

Let $A$ be a type and let $S:A\to\mathrm{Prop}$ assign a proposition to each
input. Suppose that a proof of $\forall x:A,\ S(x)$ is given. For a specified
$a:A$, universal instantiation produces a proof of $S(a)$. Lean expresses this
as another application:

```lean
theorem specialize
    (A : Type)
    (S : A → Prop)
    (h : ∀ x : A, S x)
    (a : A) :
    S a :=
  h a
```

Read these parameters in order. The type `A` is declared first. Next,
`S : A → Prop` supplies a family of propositions indexed by elements of `A`.
For each `a : A`, the expression `S a` is a proposition. Supplying `S` alone
supplies no proofs of its values. The parameter `h : ∀ x : A, S x` supplies a
proof at every index. Finally, `a : A` specifies where a proof is wanted.

| Code line | Its role |
| --- | --- |
| `theorem specialize` | Name universal instantiation in this form. |
| `(A : Type)` | Declare the type of indices. |
| `(S : A → Prop)` | Supply the proposition family. |
| `(h : ∀ x : A, S x)` | Supply a proof at every index. |
| `(a : A) :` | Specify the index and introduce the result type. |
| `S a :=` | Require a proof of the proposition at that index. |
| `h a` | Obtain that proof by applying `h` to `a`. |

The type of `h` can equivalently be written

```lean
(x : A) → S x
```

The input name bound before the arrow occurs in the type to its right. The
result type is determined by the supplied argument. In a context containing
`a b : A`, application gives `h a : S a` and `h b : S b`. The common family name
`S` does not identify those two propositions: an index really occurs in each
result type.

For a well-formed type $T(x)$ in context $\Gamma,x:A$, the dependent application
rule is

$$
\frac{\Gamma\vdash h:(x:A)\to T(x)\qquad\Gamma\vdash a:A}
     {\Gamma\vdash h\,a:T(a)}.
$$

The conclusion substitutes the supplied argument for the bound name in the
result type. Here $T(x)$ is the proposition $S(x)$, and the resulting term is its
proof. Universal instantiation is therefore application to a dependent proof
function.

An ordinary function type `A → B` is the special case `(x : A) → B` in which
the result type does not depend on `x`. An implication `P → Q` likewise binds
a proof of `P` while keeping its conclusion proposition `Q` independent of
that proof. The three examples share a construction while retaining their
particular input and output types.

The family `S : A → Prop` supplies propositions rather than Boolean answers.
The proof `h` supplies inhabitants of those propositions. This use of `∀`
expresses a dependent type and its proof; it is not a program looping over all
inputs to decide whether each proposition is true. Existential propositions
will require their own introduction and elimination rules. Their notation does
not turn arbitrary mathematical assertions into Boolean computations either.

**Variation C.** Add a type `B`, a function `f : B → A`, and an input `b : B`.
Use `h` to prove `S (f b)`. Identify the type of `f b` before applying `h`.
The [unfinished variation](../Practice/Specialization.lean) and
[complete solution](../Study/Solutions.lean) are separate files.

**Deliberate mistake C.** The [error file](../Practice/SpecializationMistake.lean)
has parameters `a b : A`, a goal `S a`, and the proposed proof `h b`. The proposed
term has type `S b`, so Lean reports a mismatch with the required type `S a`.
No relation between the indices has been supplied. Replacing `h b` by `h a`
proves the requested statement with the given hypotheses.

Book reading: [Quantifiers and Equality](https://lean-lang.org/theorem_proving_in_lean4/Quantifiers-and-Equality/),
particularly The Universal Quantifier.

## The next sequence

These examples use a small part of Lean's foundation. Lean includes universes,
inductive types and other principles beyond the original Calculus of
Constructions. Their effect on a formalization requires further study beyond
recognizing the notation used in this unit.

The next sequence is:

1. Substitution and beta reduction; definitional versus propositional equality.
2. Products, conjunction, disjunction and existence, with their elimination rules.
3. Inductive types, recursion and induction.
4. Implicit arguments, elaboration and type classes.
5. Universes, proof irrelevance, classical principles and axiom inspection.
6. Applying the foundations while reading small Mathlib proofs.

Only this first unit is included as a completed lesson. Its default project
build imports the completed examples and solutions. Unfinished variations and
deliberate errors are opened individually through their links or lesson actions;
they do not belong to that successful build.

Lean checks the formal declarations under their stated types and hypotheses.
Comparing those declarations with an intended mathematical statement is a
separate part of using the formalization.
