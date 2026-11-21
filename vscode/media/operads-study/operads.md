# Operads from finite lists

The inputs of an operad operation form an ordered list. When operations are
substituted into its slots, their input lists are concatenated. The list monad
makes that rule explicit and gives a first example, the associative operad.

These notes accompany Gijs Heuts and Ieke Moerdijk’s *Simplicial and Dendroidal
Homotopy Theory* (2022), Chapter 1, “Operads.” Page numbers refer to the printed
book. [Chapter and PDF](https://doi.org/10.1007/978-3-031-10447-3_1)

- [The list monad](#the-list-monad) explains ordered lists, singleton insertion
  and flattening.
- [The associative operad](#the-associative-operad) uses words in which each
  input label occurs once.
- [Coloured symmetric operads](#coloured-symmetric-operads) assigns a set of
  operations to each input list and output colour.
- [Algebras and trees](#algebras-and-trees) connects the definition to functions
  and to grafting.

## The list monad

For a set $X$, let $L(X)=\coprod_{n\ge 0}X^n$ be the set of finite ordered lists
of elements of $X$. An entry can occur more than once. The summand $X^0$ consists
of the single empty list $[]$. For a function $f:X\to Y$, the function
$L(f):L(X)\to L(Y)$ applies $f$ to each entry:
$$
L(f)([x_1,\ldots,x_n])=[f(x_1),\ldots,f(x_n)].
$$
Applying an identity function leaves every entry fixed, and applying $f$ followed
by $g$ to each entry has the effect of applying $g\circ f$. Thus $L$ is a
functor from sets to sets.

The function $\eta_X:X\to L(X)$ puts an element into a singleton list,
$\eta_X(x)=[x]$. The function $\mu_X:L(L(X))\to L(X)$ concatenates the inner
lists in order. For example,
$$
\mu_X([[u,v],[],[w]])=[u,v,w].
$$
An empty inner list contributes no entries, and $\mu_X([])=[]$.

### Monad axioms

An **endofunctor** $T$ on a category sends its objects and arrows to objects
and arrows of the same category, preserving identities and composition. Write
$T^2=T\circ T$ and $T^3=T\circ T\circ T$.

A **monad** consists of an endofunctor $T$, a unit $\eta:\mathrm{Id}\to T$ and a
multiplication $\mu:T^2\to T$. The unit and multiplication are natural
transformations. This means that their component arrows $\eta_X:X\to TX$ and
$\mu_X:T^2X\to TX$ make the following squares commute for every arrow $f:X\to Y$.

Naturality of the unit means applying $f$ commutes with inserting a singleton
when $T=L$.

```tikz
\begin{tikzcd}
X \arrow[r,"\eta_X"] \arrow[d,"f"'] & TX \arrow[d,"T(f)"] \\
Y \arrow[r,"\eta_Y"'] & TY
\end{tikzcd}
```

Naturality of multiplication means applying $f$ to every entry gives the same
list before or after flattening when $T=L$.

```tikz
\begin{tikzcd}
T^2X \arrow[r,"\mu_X"] \arrow[d,"T^2(f)"'] & TX \arrow[d,"T(f)"] \\
T^2Y \arrow[r,"\mu_Y"'] & TY
\end{tikzcd}
```

The first **unit law** says that $\mu_X\circ\eta_{TX}$ is the identity on $TX$.
For lists, $\eta_{LX}$ wraps the whole list in a singleton. Flattening unwraps
it.

```tikz
\begin{tikzcd}
TX \arrow[r,"\eta_{TX}"] \arrow[dr,"\mathrm{id}_{TX}"'] &
T^2X \arrow[d,"\mu_X"] \\
& TX
\end{tikzcd}
```

The second unit law says that $\mu_X\circ T(\eta_X)$ is the identity on $TX$.
For lists, $L(\eta_X)$ wraps each entry in a singleton. Flattening joins the
singletons. In particular, both unit laws apply to the empty list.

```tikz
\begin{tikzcd}
TX \arrow[r,"T(\eta_X)"] \arrow[dr,"\mathrm{id}_{TX}"'] &
T^2X \arrow[d,"\mu_X"] \\
& TX
\end{tikzcd}
```

The **associativity law** says that the following square commutes for every
object $X$.

```tikz
\begin{tikzcd}
T^3X \arrow[r,"T(\mu_X)"] \arrow[d,"\mu_{TX}"'] &
T^2X \arrow[d,"\mu_X"] \\
T^2X \arrow[r,"\mu_X"'] & TX
\end{tikzcd}
```

For lists, $L(\mu_X)$ flattens each entry of the outer list. The map $\mu_{LX}$
first joins the outer list of blocks, giving a list of lists of elements of
$X$. In both paths the final list reads the original entries in order by
outer, middle and inner position. Thus $(L,\eta,\mu)$ is a monad.
[Leinster, *General Operads and Multicategories*, Example 1.4(ii)](https://arxiv.org/pdf/math/9810053#page=5)

## The associative operad

For $n\ge 0$, let $I_n=\{1,\ldots,n\}$ be the set of input labels. Start with
$L(I_n)$ and take the words in which each label occurs exactly once. Call this
set $\mathrm{Ass}(n)$. For instance, $\mathrm{Ass}(2)$ contains $[1,2]$ and
$[2,1]$, and $\mathrm{Ass}(0)$ contains just $[]$. A word tells us in which
order to read the inputs.

To substitute into a word $w\in\mathrm{Ass}(n)$, choose a word
$v_i\in\mathrm{Ass}(k_i)$ for each input label $i$. Put $N=k_1+\cdots+k_n$.
Give $v_i$ the next $k_i$ labels after the first $k_1+\cdots+k_{i-1}$ labels,
preserving its order. The renumbered word $b_i$ uses the labels assigned to
block $i$. Define $f:I_n\to L(I_N)$ by $f(i)=b_i$. The composite is
$$
\mu_{I_N}\bigl(L(f)(w)\bigr).
$$
The map $L(f)$ replaces each label in $w$ by its assigned word. Then $\mu_{I_N}$
flattens those words. For $w=[2,1]$, with $b_1=[1,2]$ and $b_2=[3]$, the
composite is $[3,1,2]$. Every final label occurs once because each block occurs
once and the blocks partition $I_N$.

The identity operation is $[1]$. When substituting at three levels, number the
final slots by their successive positions in the three levels. Either order
of substitution then uses the same numbering and reads the same nested word,
by associativity of flattening. A permutation $\sigma$ of $I_n$ sends new
slot $j$ to old slot $\sigma(j)$. Its right action on a word replaces each old
label $i$ by $\sigma^{-1}(i)$. Relabelling whole blocks or labels within a
block commutes with substitution in the corresponding order.

This constructs the one-colour **associative operad** from the list monad.
An operation of arity $n$ is a permutation of $n$ labels, so this is
$\mathrm{Ass}(n)=\Sigma_n$ in the book’s notation. The free algebra for this
operad on a set $X$ consists of words in $X$, whose entries can repeat.
Its free-algebra monad is $L$. [Heuts–Moerdijk, Example 1.5(b), p. 7, and §1.2.2, p. 14](https://doi.org/10.1007/978-3-031-10447-3_1)

## Coloured symmetric operads

Let $C$ be a set whose elements are called **colours**. A colour specifies a
type of input or output. A coloured symmetric operad $P$ in sets gives a set
$P(\ell;c)$ for every list $\ell\in L(C)$ and colour $c\in C$. An element of
$P([c_1,\ldots,c_n];c)$ takes inputs of colours $c_1,\ldots,c_n$ in those
positions and produces one output of colour $c$. The same colour can occur
at several positions.

Choose $p\in P([c_1,\ldots,c_n];c)$. The tuple $(q_1,\ldots,q_n)$ used for
substitution contains one operation $q_i\in P(\ell_i;c_i)$ for each slot of
$p$. Its output colour must match that slot. The composite has output colour
$c$ and its input list is obtained by flattening the list of the inner input
lists:
$$
p(q_1,\ldots,q_n)\in P\bigl(\mu_C([\ell_1,\ldots,\ell_n]);c\bigr).
$$
Flattening determines the set to which the composite belongs. The operad
specifies the member of that set.

Each colour $c$ has a unit operation $1_c\in P([c];c)$. Substituting the units
into all slots of $p$, or substituting $p$ into the sole slot of $1_c$, gives
$p$. In a three-level substitution, composing the inner two levels first or
the outer two levels first gives the same operation.

For every permutation $\sigma$ of $I_n$, the operad gives a right action
$p\mapsto p\cdot\sigma$ that puts the old slot $\sigma(j)$ in new position
$j$. The identity permutation acts as the identity, and
$(p\cdot\sigma)\cdot\tau=p\cdot(\sigma\circ\tau)$. Substitution is equivariant:
reordering the outer slots together with their assigned operations gives the
original composite acted on by the induced permutation of whole input blocks.
Permuting the inputs of an inner operation gives the original composite acted
on by the corresponding permutation within its block.
[Heuts–Moerdijk, Definition 1.1 and Remark 1.2, pp. 4–5](https://doi.org/10.1007/978-3-031-10447-3_1)

### A repeated colour and an empty block

Suppose $p\in P([a,b,a];c)$. Choose $q_1\in P([u,v];a)$,
$q_2\in P([];b)$ and $q_3\in P([w];a)$. The two slots of colour $a$ occupy
different positions. The operation $q_2$ supplies an output of colour $b$,
and its empty list contributes zero inputs. Thus
$p(q_1,q_2,q_3)\in P([u,v,w];c)$.

What is the composite’s input list if $q_2$ is replaced by $1_b$? How does
that list change if the inner operations assigned to slots one and three are
then exchanged?

## Algebras and trees

Take a set $A_c$ for each colour $c$. An algebra for $P$ interprets an operation
$p\in P([c_1,\ldots,c_n];c)$ as a function
$A(p):A_{c_1}\times\cdots\times A_{c_n}\to A_c$, respecting units,
substitution and permutations. The input list gives the colours of the
slots. An input tuple to $A(p)$ supplies an actual element of each
corresponding set. Substitution is then ordinary composition with the functions
for the inner operations applied to their respective blocks.
[Heuts–Moerdijk, Example 1.3(a), p. 5, and Definition 1.10, p. 10](https://doi.org/10.1007/978-3-031-10447-3_1)

In §1.3, a rooted tree represents operations at its vertices and their slots
by edges. Grafting a tree to an input attaches the output root of the inserted
tree to that input. The leaves record the inputs that remain. Sections 1.4–1.5
use this picture to describe substitution and construct free operads. Those
free operads enter the definition of the tree category in §3.2.
[Heuts–Moerdijk, Chapter 1, §§1.3–1.5](https://doi.org/10.1007/978-3-031-10447-3_1) · [Chapter 3, §3.2](https://doi.org/10.1007/978-3-031-10447-3_3)
