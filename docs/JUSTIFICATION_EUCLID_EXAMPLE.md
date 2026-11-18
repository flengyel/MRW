# Euclid's lemma: two grounds for one conclusion

**Euclid's lemma.** Let $p,a,b$ be natural numbers, with $p$ prime. If $p\mid ab$,
then $p\mid a$ or $p\mid b$.

The following proofs use different theorems: Bézout's identity and unique prime
factorization. Keeping both arguments reveals which grounds each uses.

## Proof using Bézout's identity

If $p\mid a$, the conclusion holds. Suppose $p\nmid a$. Since $p$ is prime,
$\gcd(p,a)=1$. Bézout's identity gives integers $u,v$ such that
$$
up+va=1.
$$
Multiplying by $b$ gives
$$
upb+vab=b.
$$
Both terms on the left are divisible by $p$, so $p\mid b$.

## Proof using unique prime factorization

If $a=0$ or $b=0$, the conclusion holds. Suppose both are positive.
Their prime factorizations concatenate to a prime factorization of $ab$.
Since $p\mid ab$, write $ab=pc$. Here $c$ is positive. Factoring $c$ and using
uniqueness shows that $p$ occurs in the factorization of $a$ or that of $b$.
Thus $p\mid a$ or $p\mid b$.

## What the engine records

Let $E$ denote the complete statement of Euclid's lemma above, $B$ Bézout's
theorem for coprime integers, and $U$ unique prime factorization of positive
integers. The two prose proofs supply the implications $B\to E$ and $U\to E$
using the stated definitions and ordinary arithmetic. Their scope includes
all $p,a,b$ in the displayed statement, including zero cases.

The bounded search example supplies four explicit admissions:

| Reason assertion | Ground |
| --- | --- |
| $b:B$ | The selected Bézout theorem is admitted. |
| $c:(B\to E)$ | The first argument is admitted as the bridge from $B$ to $E$. |
| $u:U$ | The selected unique-factorization theorem is admitted. |
| $d:(U\to E)$ | The second argument is admitted as the bridge from $U$ to $E$. |

Here $t:A$ means that $t$ is a reason for the exact assertion $A$ under these
admissions. The search constructs the separate reasons $c\cdot b:E$ and
$d\cdot u:E$. It records the two admission footprints instead of treating the
routes as two independent votes or a confidence score. Both arguments also
use ordinary arithmetic; separate routes do not establish independence of
their underlying mathematics.

If the reader withdraws the admission for the first bridge, the successor
context retains $d\cdot u:E$. The earlier context and both earlier certificates
remain available. If no route survives, the search has lost its recorded
support for $E$; it has not disproved Euclid's lemma.

## What is implemented

The [Lean API](JUSTIFICATION_ROUTE_SEARCH.md) and its
[executable regressions](../lean/RouteTests.lean) construct and check both
conditional routes and the successor after withdrawal. The arithmetic
statements are opaque atoms in this test. The engine checks their admitted
composition; these tests do **not** constitute Lean formalizations of the two
number-theoretic proofs.

The reader now retains source-bound search results, shows the separate routes,
checks an explicit withdrawal and reopens the predecessor or successor. Choose
**Proofs → Justification… → Explore Euclid’s lemma**. Use [selected text or retained passages](SOURCE_GROUNDS_WORKFLOW.md) to prepare
and review grounds from another note.
