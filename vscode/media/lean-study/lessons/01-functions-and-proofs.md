# Lean 4: introduction and functions

## Introduction

Lean checks a proof against a stated conclusion and its hypotheses. To use it,
one writes the mathematical objects, statement and proof in Lean's language.
This translation is called **formalization**. The reader must still determine
whether the formal statement expresses the intended mathematical claim.

This study explains three constructions: composing functions, composing proofs
of implications, and applying a universally quantified proof to a chosen input.
The same operation connects them: supplying an argument to a function. We begin
with ordinary functions so that this operation is familiar before it is used
on proofs. Each construction is accompanied by the rules that justify it.

The lessons assume familiarity with functions and elementary logic. They
introduce the Lean syntax and type-theoretic vocabulary as needed. Read them
in order; the completed examples can be inspected before attempting a variation.

## Tutorial contents

1. [Functions and composition](#functions-and-composition) — define a composite
   function and account for the type of each expression.
2. [Implication as a function on proofs](02-implication.md) — compose two
   implications, then express the proof as instructions to Lean.
3. [Dependent application](03-dependent-application.md) — obtain a proof for
   a chosen input from a proof that covers every input.

## Working with the examples

Keep the [working examples](../Study/Examples.lean) beside the text. The examples
are complete. The surrounding `namespace` and `end` lines group the names
declared between them. Each lesson ends with an optional
variation and a deliberate error, with links to their files and a solution.
[Your notes](../Notes.md) is an ordinary Markdown file for questions and calculations.

Lean's **InfoView** is the panel showing the available assumptions and what
remains to be proved at the cursor. The second lesson explains its display.
Live feedback requires the official **Lean 4** VS Code extension on the workspace
host: in a WSL: Debian window, install it in WSL: Debian.
The project uses Lean 4.33.0 and its core library. **MRW: Lean Study Actions…**
opens the files for the selected lesson; **MRW: Resume Lean Study** returns
to the saved lesson and code location. **MRW: Return from Lean Study** returns
to the document from which the study was opened.

## Functions and composition

Given functions $f:A\to B$ and $g:B\to C$, their composite sends $x$ to
$g(f(x))$. We shall define this function in Lean and account for the type of
each expression in its definition. Begin at `compose` in the working examples.

- [Names, types and binders](#names-types-and-binders)
- [Application and abstraction](#application-and-abstraction)
- [Defining the composite](#defining-the-composite)
- [Checking the body](#checking-the-body)
- [Checking a type and computing a value](#checking-a-type-and-computing-a-value)
- [Variation and error](#variation-and-error)

### Names, types and binders

Lean classifies expressions by **types**. For example, `Nat` is the type of
natural numbers, starting at zero, and `2 : Nat` says that `2` has this type.
An expression considered with its type is called a **term**. A function is
also a term: `f : A → B` says that `f` takes an input of type `A` and produces
an output of type `B`.

A **binder** declares a name and its type for use in part of an expression.
For example, `(x : A)` declares the name `x` with type `A`. The part in which
the name refers to this declaration is its **scope**. In a function definition,
an input binder makes its name available in subsequent input declarations and
in the defining expression.

Lean writes `A : Type` to declare a type `A`. Here `Type`, also written
`Type 0`, is a **universe**: a type whose terms are themselves types.
For example, `Nat : Type` and `Bool : Type`, where `Bool` is the type with
values `true` and `false`. The universe `Type` itself has type `Type 1`.
This lesson uses types in `Type 0`.

The grouped binder `(A B C : Type)` abbreviates
`(A : Type) (B : Type) (C : Type)`. These declarations make `A`, `B` and `C`
available in the following binders for `g` and `f`.

### Application and abstraction

**Application** means supplying an argument to a function. Lean writes `f x`
for $f(x)$. Thus `g (f x)` supplies the result of `f x` to `g`. Parentheses
matter: `g f x` means `(g f) x`, which first tries to supply `f` to `g`.
Here `g` expects a term of type `B`, whereas `f` has type `A → B`.

**Function abstraction** constructs a function by binding an input name in an
expression for its output. Lean writes

```lean
fun x : A => g (f x)
```

for the function sending `x` to `g (f x)`. The keyword `fun` begins the
abstraction, and `=>` separates the input declaration from the output expression. The scope of `x`
is `g (f x)`; its occurrences there are **bound** by this declaration.
Renaming this input consistently, as in
`fun y : A => g (f y)`, gives the same function.

### Defining the composite

A **parameter** is a named input to a declaration. The following definition
has five parameters: three types and two functions.

```lean
def compose
    (A B C : Type)
    (g : B → C)
    (f : A → B) :
    A → C :=
  fun x : A => g (f x)
```

The keyword `def` introduces the name `compose`. The colon after the last
parameter introduces the result type, `A → C`. The symbol `:=` introduces
the **body**, the expression defining that result. It separates the type
specification from the definition; an assertion of equality would use `=`.

Supplying the parameters in the order `A`, `B`, `C`, `g`, `f` gives a function
from `A` to `C`. That function applies `f` before `g`. The order of application
is determined by the body, even though `g` precedes `f` in the parameter list.

### Checking the body

A **context** is a list of declarations available when an expression is
checked. Each declaration may use names declared earlier. Write $\Gamma$ for
the context containing `A B C : Type`, `g : B → C` and `f : A → B`.
A **typing judgment**

$$
\Gamma\vdash t:T
$$

states that $t$ has type $T$ in this context. The judgment describes the
typing of an expression. In particular, `x : Nat` declares a natural-number
variable; it does not assert membership in a set inside Lean.

Extend $\Gamma$ by the temporary declaration `x : A`. The body then has the
following types.

| Expression | Type | Reason |
| --- | --- | --- |
| `x` | `A` | The binder declares it. |
| `f x` | `B` | Apply `f : A → B` to `x : A`. |
| `g (f x)` | `C` | Apply `g : B → C` to `f x : B`. |

The **application rule** states this inference for a function and an argument:

$$
\frac{\Gamma\vdash f:A\to B\qquad\Gamma\vdash a:A}
     {\Gamma\vdash f\,a:B}.
$$

The judgments above the line are the premises; the judgment below it is the
conclusion. Applying the rule twice gives the last row of the table.

The **abstraction rule** binds the temporary input. For types $A$ and $B$
defined in $\Gamma$, with $B$ independent of $x$, it has the form

$$
\frac{\Gamma,x:A\vdash t:B}
     {\Gamma\vdash(\mathrm{fun}\ x:A\Rightarrow t):A\to B}.
$$

Here $x$ is a new name, absent from $\Gamma$, and $\Rightarrow$ represents
Lean's `=>` separator.
Using `g (f x)` for the body gives a function of type `A → C`, as required.
The input `x` is bound in the function; its temporary declaration is removed
from the context in the conclusion.

### Checking a type and computing a value

```lean
#check compose
#check compose Nat Nat Nat (fun n => n + 10) (fun n => 2 * n)
#eval compose Nat Nat Nat (fun n => n + 10) (fun n => 2 * n) 2
```

The command `#check` checks an expression and displays its type. The type of
`compose` includes all five parameters:

```lean
(A B C : Type) → (B → C) → (A → B) → A → C
```

Arrows associate to the right. After five arguments, the result still accepts
an argument of type `A`. The parentheses around `B → C` and `A → B` indicate
that whole functions are supplied as arguments.

The second `#check` line supplies `Nat` for all three types, addition of ten
for `g`, and doubling for `f`. Its type is `Nat → Nat`. In `fun n => ...`,
Lean infers the omitted input type from the expected argument type.

The command `#eval` computes the value of an expression. In the last line,
doubling sends $2$ to $4$, and addition of ten sends $4$ to $14$. Lean displays
`14`.

### Variation and error

Given `A : Type` and `f : A → A`, define `thrice : A → A` by applying `f`
three times. Identify the type of each intermediate expression. Open the
[variation](../Practice/Functions.lean) or its
[solution](../Study/Solutions.lean), under Variation A.

The [deliberate error](../Practice/FunctionMistake.lean) replaces `g (f x)`
by `g x`. In its context, `x : A`, while `g` requires an input of type `B`.
The independent parameters `A` and `B` supply no identification between these
types. The term `f x` supplies the required input.

Further reading: *Theorem Proving in Lean 4*,
[Dependent Type Theory](https://lean-lang.org/theorem_proving_in_lean4/Dependent-Type-Theory/),
especially Function Abstraction and Evaluation, and Definitions.

[Introduction](#introduction) · [Tutorial contents](#tutorial-contents) ·
[Next: implication as a function on proofs](02-implication.md)
